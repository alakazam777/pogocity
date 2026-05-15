'use client';

import { useLanguage } from '@/context/LanguageContext';
import { PRIVACY, LEGAL_LAST_UPDATED } from '@/lib/legalContent';
import LegalLayout from '@/components/LegalLayout';

export default function PrivacyPage() {
    const { lang } = useLanguage();
    const content = PRIVACY[lang] || PRIVACY.en;
    return <LegalLayout content={content} lastUpdated={LEGAL_LAST_UPDATED} />;
}
