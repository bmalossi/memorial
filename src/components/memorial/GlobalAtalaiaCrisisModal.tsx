import React, { useState, useEffect } from 'react';
import { AtalaiaCrisisModal } from './AtalaiaCrisisModal';
import { AtalaiaContactModal } from './AtalaiaContactModal';
import {
  subscribeToCrisisModal,
  dismissGlobalAtalaiaCrisis,
  CrisisModalData,
} from '../../lib/atalaiaCrisisManager';
import { fetchCurrentPastoralContact, sendPastoralEcosystemEmail } from '../../lib/atalaiaStore';
import { PastoralContact } from '../../lib/atalaiaTypes';

/**
 * GlobalAtalaiaCrisisModal — Renderizado no topo da árvore de navegação (RootNavigator).
 *
 * Garante que o modal de acolhimento e apoio à vida (CVV 188 / Pastoral) seja exibido
 * sobre qualquer tela que o usuário esteja navegando no aplicativo (Linha Sagrada,
 * Leitor da Bíblia, Busca, Perfil ou Detalhe do Marco).
 */
export function GlobalAtalaiaCrisisModal() {
  const [crisisData, setCrisisData] = useState<CrisisModalData>({ visible: false });
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [pastoralContact, setPastoralContact] = useState<PastoralContact | null>(null);

  useEffect(() => {
    // 1. Escuta chamadas globais de crise de qualquer parte do app
    const unsubscribe = subscribeToCrisisModal((data) => {
      setCrisisData(data);
    });

    // 2. Carrega contato pastoral atual
    fetchCurrentPastoralContact()
      .then(setPastoralContact)
      .catch(() => {});

    return unsubscribe;
  }, []);

  const handleCloseCrisis = () => {
    dismissGlobalAtalaiaCrisis();
  };

  const handleConfigurePastor = () => {
    dismissGlobalAtalaiaCrisis();
    setContactModalVisible(true);
  };

  const handleSendPastoralAlert = async () => {
    if (crisisData.noteId) {
      try {
        await sendPastoralEcosystemEmail({
          type: 'CRISIS',
          noteId: crisisData.noteId,
        });
      } catch (err) {
        console.warn('[GlobalCrisisModal] Erro ao enviar sinal pastoral:', err);
      }
    }
  };

  return (
    <>
      <AtalaiaCrisisModal
        visible={crisisData.visible}
        onClose={handleCloseCrisis}
        pastorName={crisisData.pastorName || pastoralContact?.name}
        hasActivePastor={
          crisisData.hasActivePastor ?? (pastoralContact?.status === 'active')
        }
        onConfigurePastor={handleConfigurePastor}
        onSendPastoralAlert={handleSendPastoralAlert}
      />

      <AtalaiaContactModal
        visible={contactModalVisible}
        onClose={() => setContactModalVisible(false)}
        currentContact={pastoralContact}
        onContactUpdated={async () => {
          const contact = await fetchCurrentPastoralContact();
          setPastoralContact(contact);
        }}
      />
    </>
  );
}
