// SEPA Credit Transfer XML generator (pain.001.001.03)
// Gebruikt voor bulk betalingen aan leveranciers

export interface SEPABetaling {
  naam: string;
  iban: string;
  bic?: string;
  bedrag: number;
  omschrijving: string;
  referentie?: string;
}

export interface SEPAOpdrachtgever {
  naam: string;
  iban: string;
  bic: string;
}

export function generateSEPA(
  opdrachtgever: SEPAOpdrachtgever,
  betalingen: SEPABetaling[],
  uitvoeringsdatum?: string
): string {
  const msgId = `LF-${Date.now()}`;
  const creatieDatum = new Date().toISOString().replace('Z', '+00:00');
  const datum = uitvoeringsdatum || new Date().toISOString().split('T')[0];
  const totaalBedrag = betalingen.reduce((s, b) => s + b.bedrag, 0).toFixed(2);

  const transacties = betalingen.map((b, i) => {
    const ref = b.referentie || `${msgId}-${i + 1}`;
    return `
    <CdtTrfTxInf>
      <PmtId>
        <EndToEndId>${escapeXml(ref)}</EndToEndId>
      </PmtId>
      <Amt>
        <InstdAmt Ccy="EUR">${b.bedrag.toFixed(2)}</InstdAmt>
      </Amt>
      ${b.bic ? `<CdtrAgt><FinInstnId><BIC>${escapeXml(b.bic)}</BIC></FinInstnId></CdtrAgt>` : ''}
      <Cdtr>
        <Nm>${escapeXml(b.naam)}</Nm>
      </Cdtr>
      <CdtrAcct>
        <Id><IBAN>${escapeXml(b.iban.replace(/\s/g, ''))}</IBAN></Id>
      </CdtrAcct>
      <RmtInf>
        <Ustrd>${escapeXml(b.omschrijving.slice(0, 140))}</Ustrd>
      </RmtInf>
    </CdtTrfTxInf>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${escapeXml(msgId)}</MsgId>
      <CreDtTm>${creatieDatum}</CreDtTm>
      <NbOfTxs>${betalingen.length}</NbOfTxs>
      <CtrlSum>${totaalBedrag}</CtrlSum>
      <InitgPty>
        <Nm>${escapeXml(opdrachtgever.naam)}</Nm>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${escapeXml(msgId)}-PI</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <NbOfTxs>${betalingen.length}</NbOfTxs>
      <CtrlSum>${totaalBedrag}</CtrlSum>
      <PmtTpInf>
        <SvcLvl><Cd>SEPA</Cd></SvcLvl>
      </PmtTpInf>
      <ReqdExctnDt>${datum}</ReqdExctnDt>
      <Dbtr>
        <Nm>${escapeXml(opdrachtgever.naam)}</Nm>
      </Dbtr>
      <DbtrAcct>
        <Id><IBAN>${escapeXml(opdrachtgever.iban.replace(/\s/g, ''))}</IBAN></Id>
      </DbtrAcct>
      <DbtrAgt>
        <FinInstnId><BIC>${escapeXml(opdrachtgever.bic)}</BIC></FinInstnId>
      </DbtrAgt>
      ${transacties}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function downloadSEPA(xml: string, bestandsnaam?: string): void {
  const blob = new Blob([xml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = bestandsnaam || `sepa-export-${new Date().toISOString().split('T')[0]}.xml`;
  a.click();
  URL.revokeObjectURL(url);
}
