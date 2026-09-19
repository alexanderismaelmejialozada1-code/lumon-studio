export const site = {
  name: 'Lumon Estudio',
  person: 'Alexander Mejía',
  title: 'Lumon Estudio | Desarrollo Web y Soluciones Digitales en Ecuador',
  description:
    'Creamos sitios web, sistemas y automatizaciones útiles para negocios en Ecuador que buscan generar confianza, organizarse mejor y crecer en internet.',
  navigation: [
    { label: 'Inicio', href: '#inicio' },
    { label: 'Servicios', href: '#servicios' },
    { label: 'Proyectos', href: '#proyectos' },
    { label: 'Nosotros', href: '#nosotros' },
    { label: 'Contacto', href: '#contacto' },
  ],
  cta: { primary: 'Hablemos por WhatsApp', secondary: 'Ver proyecto' },
  contact: {
    phone: '0992555953',
    internationalNumberAssumption: '+593 99 255 5953',
    internationalNumberConfirmed: false,
    whatsappNumberProvisional: '593992555953',
    whatsappEnabledForDevelopment: true,
    whatsappMessage: 'Hola, vengo desde la web de Lumon Estudio y me gustaría conversar sobre una solución digital para mi negocio.',
    publicationStatus: 'PENDIENTE DE CONFIRMACIÓN ANTES DE PUBLICACIÓN',
    email: 'lumonestudioambato@gmail.com',
    social: {
      tiktok: 'https://www.tiktok.com/@lumon.estudio',
      instagram: 'https://www.instagram.com/lumonestudio/',
      facebook: 'https://www.facebook.com/profile.php?id=61594507826794',
    },
  },
  project: { name: 'ONYX', url: 'https://onyx-web-a78.pages.dev/' },
} as const;

// Provisional para desarrollo. Alexander debe confirmar el número antes de publicación.
// false revierte todos los CTA primarios a #contacto desde este único lugar.
export const whatsappHref = site.contact.whatsappEnabledForDevelopment
  ? `https://wa.me/${site.contact.whatsappNumberProvisional}?text=${encodeURIComponent(site.contact.whatsappMessage)}`
  : '#contacto';

export const socialLinks = [
  { label: 'Instagram', href: site.contact.social.instagram },
  { label: 'TikTok', href: site.contact.social.tiktok },
  { label: 'Facebook', href: site.contact.social.facebook },
] as const;
