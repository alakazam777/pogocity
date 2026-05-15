'use client';

import { useLanguage } from '@/context/LanguageContext';
import { ACCOUNT_DELETION, LEGAL_LAST_UPDATED } from '@/lib/legalContent';
import LegalLayout from '@/components/LegalLayout';

export default function AccountDeletionPage() {
    const { lang } = useLanguage();
    const content = ACCOUNT_DELETION[lang] || ACCOUNT_DELETION.en;
    return <LegalLayout content={content} lastUpdated={LEGAL_LAST_UPDATED} />;
}
