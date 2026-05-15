'use client';

import { useLanguage } from '@/context/LanguageContext';
import { TERMS, LEGAL_LAST_UPDATED } from '@/lib/legalContent';
import LegalLayout from '@/components/LegalLayout';

export default function TermsPage() {
    const { lang } = useLanguage();
    const content = TERMS[lang] || TERMS.en;
    return <LegalLayout content={content} lastUpdated={LEGAL_LAST_UPDATED} />;
}
