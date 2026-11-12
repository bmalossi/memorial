# check-unsaved-progress.ps1
# Script de proteção de encerramento auditado (Hook Stop) do Memorial
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

try {
    # 1. Ler e parsear payload JSON do stdin
    $inputJson = [Console]::In.ReadToEnd()
    if ([string]::IsNullOrWhiteSpace($inputJson)) {
        Write-Output "{}"
        exit 0
    }

    $payload = $inputJson | ConvertFrom-Json -ErrorAction SilentlyContinue
    if (-not $payload) {
        Write-Output "{}"
        exit 0
    }

    # 2. Verificar motivo de encerramento: somente término normal da fala do modelo
    if ($payload.terminationReason -ne "NO_TOOL_CALL") {
        Write-Output "{}"
        exit 0
    }

    # 3. Verificar se o ambiente está totalmente ocioso (não interromper tarefas em segundo plano)
    if ($payload.PSObject.Properties['fullyIdle'] -and (-not $payload.fullyIdle)) {
        Write-Output "{}"
        exit 0
    }

    # 4. Blindagem anti-loop: nunca forçar continuação mais de uma vez no mesmo ciclo de execução
    if ($payload.executionNum -gt 1) {
        Write-Output "{}"
        exit 0
    }

    # 5. Identificar diretório do repositório
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $agentsDir = Split-Path -Parent $scriptDir
    $repoDir   = Split-Path -Parent $agentsDir

    # 6. Verificar Git excluindo a própria pasta de automação (.agents) para evitar falsos positivos
    $gitStatus   = & git -C $repoDir status --porcelain -- ":(exclude).agents" 2>$null
    $currentHead = & git -C $repoDir rev-parse --short HEAD 2>$null
    $hasDirty    = (-not [string]::IsNullOrWhiteSpace($gitStatus))

    # 7. Verificar o estado REAL já confirmado no Obsidian (fonte da verdade)
    # Busca pela nota no caminho padrão do vault
    $obsidianNote = "G:\Meu Drive\Obsidian\Bruno Malossi\Pessoal\Projetos\Memorial\Estado-Atual.md"
    $confirmedCommit = $null
    if (Test-Path $obsidianNote) {
        $lines = Get-Content -Path $obsidianNote -TotalCount 25 -ErrorAction SilentlyContinue
        $content = [string]::Join("`n", $lines)
        if ($content -match 'ultimo_commit_verificado:\s*([a-f0-9]+)') {
            $confirmedCommit = $matches[1]
        }
    }

    # Se a árvore estiver limpa E o commit atual já estiver devidamente confirmado no Obsidian
    $isCommitConfirmed = ($confirmedCommit -and ($currentHead -like "$confirmedCommit*"))
    if (-not $hasDirty -and $isCommitConfirmed) {
        Write-Output "{}"
        exit 0
    }

    # 8. Evitar loops imediatos na mesma conversa usando trava em memória/arquivo
    $lockFile = Join-Path $agentsDir "last_stop_check.json"
    $turnKey  = "$($payload.conversationId)_$($payload.executionNum)"
    if (Test-Path $lockFile) {
        $lockData = Get-Content $lockFile -Raw -ErrorAction SilentlyContinue | ConvertFrom-Json -ErrorAction SilentlyContinue
        if ($lockData -and ($lockData.turnKey -eq $turnKey)) {
            Write-Output "{}"
            exit 0
        }
    }

    # Registrar tentativa deste turno específico (permite nova tentativa em turnos subsequentes se a escrita falhar)
    $newLock = @{
        turnKey   = $turnKey
        head      = $currentHead
        dirty     = $hasDirty
        timestamp = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
    }
    $newLock | ConvertTo-Json -Compress | Set-Content -Path $lockFile -Encoding UTF8

    # 9. Notificar agente para salvar checkpoint se houver progresso não confirmado
    $response = @{
        decision = "continue"
        reason   = "[Project Memory Guard] Modificações técnicas ou novo commit não confirmados no Estado-Atual.md do Memorial. Execute a Skill project-memory para consolidar o checkpoint antes de finalizar."
    }
    $response | ConvertTo-Json -Compress
    exit 0
} catch {
    # Em caso de qualquer falha inesperada, permitir encerramento sem quebrar o loop do usuário
    Write-Output "{}"
    exit 0
}
