// SEPA Bank Export Library (pain.001.001.03)
// ISO 20022 Credit Transfer Initiation

export interface SEPAPayment {
  invoiceNumber: string;
  creditorName: string;
  creditorIban: string;
  creditorBic?: string;
  amount: number;
  remittanceInfo: string;
}

export interface SEPAConfig {
  messageId: string;
  creationDateTime: string;
  requestedExecutionDate: string;
  debtorName: string;
  debtorIban: string;
  debtorBic: string;
  payments: SEPAPayment[];
}

export interface SEPAValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate IBAN using ISO 7064 Mod 97-10 algorithm
 */
export const validateIBAN = (iban: string): boolean => {
  if (!iban) return false;

  // Remove spaces and convert to uppercase
  const cleanIban = iban.replace(/\s/g, "").toUpperCase();

  // Check minimum (15) and maximum (34) length
  if (cleanIban.length < 15 || cleanIban.length > 34) return false;

  // Check if it starts with 2 letters (country code)
  if (!/^[A-Z]{2}/.test(cleanIban)) return false;

  // Check if the rest consists of letters and digits
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(cleanIban)) return false;

  // ISO 7064 Mod 97-10 algorithm
  // Move the first 4 characters to the end
  const rearranged = cleanIban.slice(4) + cleanIban.slice(0, 4);

  // Replace letters with digits (A=10, B=11, ..., Z=35)
  const numericString = rearranged
    .split("")
    .map((char) => {
      const code = char.charCodeAt(0);
      return code >= 65 && code <= 90 ? (code - 55).toString() : char;
    })
    .join("");

  // Calculate modulo 97 (in parts due to large numbers)
  let remainder = 0;
  for (let i = 0; i < numericString.length; i++) {
    remainder = (remainder * 10 + parseInt(numericString[i])) % 97;
  }

  return remainder === 1;
};

/**
 * Validate BIC (8 or 11 characters)
 * Format: 4 letters (bank) + 2 letters (country) + 2 alphanumeric (location) + optional 3 alphanumeric (branch)
 */
export const validateBIC = (bic: string): boolean => {
  if (!bic) return false;
  const cleanBic = bic.replace(/\s/g, "").toUpperCase();
  return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(cleanBic);
};

/**
 * Derive BIC from IBAN for Dutch banks
 */
export const deriveBICFromIBAN = (iban: string): string | null => {
  const cleanIban = iban.replace(/\s/g, "").toUpperCase();
  if (!cleanIban.startsWith("NL")) return null;

  const bankCode = cleanIban.slice(4, 8);
  const bicMap: Record<string, string> = {
    ABNA: "ABNANL2A",
    INGB: "INGBNL2A",
    RABO: "RABONL2U",
    SNSB: "SNSBNL2A",
    ASNB: "ASNBNL21",
    TRIO: "TRIONL2U",
    KNAB: "KNABNL2H",
    BUNQ: "BUNQNL2A",
    RBRB: "RBRBNL21",
    FVLB: "FVLBNL22",
  };

  return bicMap[bankCode] || null;
};

/**
 * Generate unique Message ID for SEPA file
 */
export const generateMessageId = (): string => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `MSG-${dateStr}-${random}`;
};

/**
 * XML escape helper for special characters
 */
const escapeXml = (text: string): string => {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
};

/**
 * Clean and truncate text for SEPA XML fields
 */
const cleanSEPAText = (text: string, maxLength: number): string => {
  // Remove characters not allowed in SEPA
  const cleaned = text
    .replace(/[^a-zA-Z0-9\s\-.,()'/+:?]/g, "")
    .trim()
    .substring(0, maxLength);
  return escapeXml(cleaned);
};

/**
 * Validate SEPA configuration before generating XML
 */
export const validateSEPAConfig = (config: SEPAConfig): SEPAValidationResult => {
  const errors: string[] = [];

  // Validate debtor (sender) details
  if (!config.debtorName) {
    errors.push("Bedrijfsnaam ontbreekt");
  }
  if (!validateIBAN(config.debtorIban)) {
    errors.push("Ongeldig bedrijfs-IBAN");
  }
  if (!config.debtorBic && !deriveBICFromIBAN(config.debtorIban)) {
    errors.push("Bedrijfs-BIC ontbreekt en kan niet worden afgeleid");
  }

  // Validate payments
  if (config.payments.length === 0) {
    errors.push("Geen betalingen geselecteerd");
  }

  config.payments.forEach((payment, index) => {
    if (!payment.creditorName) {
      errors.push(`Betaling ${index + 1}: Naam ontbreekt`);
    }
    if (!validateIBAN(payment.creditorIban)) {
      errors.push(`Betaling ${index + 1} (${payment.invoiceNumber}): Ongeldig IBAN`);
    }
    if (payment.amount <= 0) {
      errors.push(`Betaling ${index + 1}: Ongeldig bedrag`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Generate SEPA pain.001.001.03 XML
 */
export const generateSEPAXml = (config: SEPAConfig): string => {
  const totalAmount = config.payments.reduce((sum, p) => sum + p.amount, 0);
  const nbOfTxs = config.payments.length;

  // Use provided BIC or derive from IBAN
  const debtorBic = config.debtorBic || deriveBICFromIBAN(config.debtorIban) || "";

  const paymentInfos = config.payments
    .map((payment) => {
      const creditorBic =
        payment.creditorBic || deriveBICFromIBAN(payment.creditorIban);

      return `
      <CdtTrfTxInf>
        <PmtId>
          <EndToEndId>${cleanSEPAText(payment.invoiceNumber, 35)}</EndToEndId>
        </PmtId>
        <Amt>
          <InstdAmt Ccy="EUR">${payment.amount.toFixed(2)}</InstdAmt>
        </Amt>${
          creditorBic
            ? `
        <CdtrAgt>
          <FinInstnId>
            <BIC>${escapeXml(creditorBic)}</BIC>
          </FinInstnId>
        </CdtrAgt>`
            : ""
        }
        <Cdtr>
          <Nm>${cleanSEPAText(payment.creditorName, 70)}</Nm>
        </Cdtr>
        <CdtrAcct>
          <Id>
            <IBAN>${escapeXml(payment.creditorIban.replace(/\s/g, "").toUpperCase())}</IBAN>
          </Id>
        </CdtrAcct>
        <RmtInf>
          <Ustrd>${cleanSEPAText(payment.remittanceInfo, 140)}</Ustrd>
        </RmtInf>
      </CdtTrfTxInf>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${cleanSEPAText(config.messageId, 35)}</MsgId>
      <CreDtTm>${config.creationDateTime}</CreDtTm>
      <NbOfTxs>${nbOfTxs}</NbOfTxs>
      <CtrlSum>${totalAmount.toFixed(2)}</CtrlSum>
      <InitgPty>
        <Nm>${cleanSEPAText(config.debtorName, 70)}</Nm>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${cleanSEPAText(config.messageId, 35)}-PMT</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <BtchBookg>true</BtchBookg>
      <NbOfTxs>${nbOfTxs}</NbOfTxs>
      <CtrlSum>${totalAmount.toFixed(2)}</CtrlSum>
      <PmtTpInf>
        <SvcLvl>
          <Cd>SEPA</Cd>
        </SvcLvl>
      </PmtTpInf>
      <ReqdExctnDt>${config.requestedExecutionDate}</ReqdExctnDt>
      <Dbtr>
        <Nm>${cleanSEPAText(config.debtorName, 70)}</Nm>
      </Dbtr>
      <DbtrAcct>
        <Id>
          <IBAN>${escapeXml(config.debtorIban.replace(/\s/g, "").toUpperCase())}</IBAN>
        </Id>
      </DbtrAcct>
      <DbtrAgt>
        <FinInstnId>
          <BIC>${escapeXml(debtorBic)}</BIC>
        </FinInstnId>
      </DbtrAgt>
      <ChrgBr>SLEV</ChrgBr>${paymentInfos}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;
};

/**
 * Download SEPA XML file
 */
export const downloadSEPAFile = (xml: string, filename: string): void => {
  const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Format date for SEPA XML (YYYY-MM-DD)
 */
export const formatSEPADate = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

/**
 * Format datetime for SEPA XML (ISO 8601)
 */
export const formatSEPADateTime = (date: Date): string => {
  return date.toISOString();
};
