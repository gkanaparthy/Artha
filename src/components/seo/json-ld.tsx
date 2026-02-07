import React from 'react';
import { FAQ_DATA } from '@/lib/constants/faq-data';

export function JsonLd() {
    const organizationSchema = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "Artha",
        "alternateName": "Artha Trades",
        "url": "https://arthatrades.com",
        "logo": "https://arthatrades.com/logo.png",
        "description": "The beautiful, automated trading journal for serious traders. Master your psychology and find your edge.",
        "sameAs": [
            "https://x.com/arthatrades",
            "https://github.com/gkanaparthy/Pravaha"
        ],
        "founder": {
            "@type": "Person",
            "name": "Gautham Kanaparthy"
        }
    };

    const softwareSchema = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "Artha",
        "operatingSystem": "Web",
        "applicationCategory": "FinanceApplication",
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.9",
            "ratingCount": "120"
        },
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD",
            "description": "30-day free trial, then from $12/month"
        }
    };

    const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": FAQ_DATA.map(faq => ({
            "@type": "Question",
            "name": faq.question,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.answer
            }
        }))
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
                __html: JSON.stringify([organizationSchema, softwareSchema, faqSchema])
            }}
        />
    );
}
