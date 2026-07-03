import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  type?: string;
  name?: string;
  url?: string;
  image?: string;
  schema?: object;
}

export default function SEO({ 
  title, 
  description, 
  keywords,
  type = 'website',
  name = 'SalonFlow',
  url = 'https://salonflow.cloud',
  image = 'https://salonflow.cloud/og-image.jpg',
  schema
}: SEOProps) {
  const defaultTitle = "SalonFlow | Premium Salon Management Software";
  const defaultDescription = "Manage your salon with elegance. The premium salon management software trusted by salons in Colombo, Kandy, Galle, and globally.";
  const defaultKeywords = "salon software, salon management system, best salon software in Sri Lanka, Colombo salon software, Kandy salon software, Galle salon software, global salon software, appointment booking software, spa management";

  const siteTitle = title ? `${title} | SalonFlow` : defaultTitle;
  const siteDescription = description || defaultDescription;
  const siteKeywords = keywords || defaultKeywords;

  return (
    <Helmet>
      {/* Standard metadata tags */}
      <title>{siteTitle}</title>
      <meta name='description' content={siteDescription} />
      <meta name='keywords' content={siteKeywords} />
      
      {/* Open Graph tags */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={siteDescription} />
      <meta property="og:site_name" content={name} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      
      {/* Twitter tags */}
      <meta name="twitter:creator" content={name} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={siteTitle} />
      <meta name="twitter:description" content={siteDescription} />
      <meta name="twitter:image" content={image} />
      
      {/* Canonical Link */}
      <link rel="canonical" href={url} />

      {/* Structured Data (JSON-LD) */}
      {schema && (
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      )}
    </Helmet>
  );
}
