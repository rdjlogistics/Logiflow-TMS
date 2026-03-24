import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface PostcodeResult {
  street: string;
  city: string;
  municipality?: string;
  province?: string;
}

interface UsePostcodeLookupReturn {
  lookupPostcode: (postcode: string, houseNumber?: string) => Promise<PostcodeResult | null>;
  loading: boolean;
  error: string | null;
}

// Validate Dutch postcode format (4 digits + 2 letters)
const isValidDutchPostcode = (postcode: string): boolean => {
  const cleaned = postcode.replace(/\s/g, '').toUpperCase();
  return /^[1-9][0-9]{3}[A-Z]{2}$/.test(cleaned);
};

// Format postcode to standard format (1234 AB)
export const formatDutchPostcode = (postcode: string): string => {
  const cleaned = postcode.replace(/\s/g, '').toUpperCase();
  if (cleaned.length >= 6) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 6)}`;
  }
  return postcode;
};

export const usePostcodeLookup = (): UsePostcodeLookupReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const lookupPostcode = useCallback(async (postcode: string, houseNumber?: string): Promise<PostcodeResult | null> => {
    const cleaned = postcode.replace(/\s/g, '').toUpperCase();
    
    // Validate format
    if (!isValidDutchPostcode(cleaned)) {
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // Use the free Dutch government API (PDOK Locatieserver)
      // This is a free API that provides address data for Dutch postcodes
      const query = houseNumber 
        ? `${cleaned} ${houseNumber}` 
        : cleaned;
      
      const response = await fetch(
        `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=${encodeURIComponent(query)}&fq=type:adres&rows=1`
      );

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      
      if (data.response?.docs?.length > 0) {
        const doc = data.response.docs[0];
        return {
          street: doc.straatnaam || '',
          city: doc.woonplaatsnaam || '',
          municipality: doc.gemeentenaam || '',
          province: doc.provincienaam || '',
        };
      }

      // Fallback: Try with just the postcode for getting street/city
      if (houseNumber) {
        const fallbackResponse = await fetch(
          `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=${encodeURIComponent(cleaned)}&fq=type:postcode&rows=1`
        );
        
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          if (fallbackData.response?.docs?.length > 0) {
            const doc = fallbackData.response.docs[0];
            return {
              street: doc.straatnaam || '',
              city: doc.woonplaatsnaam || '',
              municipality: doc.gemeentenaam || '',
              province: doc.provincienaam || '',
            };
          }
        }
      }

      return null;
    } catch (err) {
      console.error('Postcode lookup error:', err);
      setError('Kon postcode niet opzoeken');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { lookupPostcode, loading, error };
};

export default usePostcodeLookup;
