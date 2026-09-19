export const services = [
  {
    number: '01', id: 'sitios-web', title: 'Desarrollo de sitios web',
    description: 'Creamos páginas web modernas, rápidas y adaptadas a celulares para pequeños negocios que quieren tener una presencia profesional en internet.',
    audience: 'Negocios que dependen principalmente de Facebook, Instagram o WhatsApp y quieren tener un espacio propio donde presentar su información de forma ordenada.',
    result: 'Una web donde sus clientes puedan conocer servicios, información relevante, fotografías y medios de contacto.',
  },
  {
    number: '02', id: 'landing-pages', title: 'Landing pages',
    description: 'Diseñamos páginas de una sola vista enfocadas en presentar un negocio, servicio, promoción o producto de forma clara y directa.',
    audience: 'Negocios que no necesitan una web grande y buscan una solución sencilla, económica y rápida de entender.',
    result: 'Una página profesional con la información esencial y una llamada clara a la acción, por ejemplo escribir por WhatsApp o solicitar información.',
  },
  {
    number: '03', id: 'sistemas-web', title: 'Sistemas web personalizados',
    description: 'Desarrollamos herramientas sencillas adaptadas a la forma en que trabaja cada negocio.',
    capabilities: ['pedidos', 'clientes', 'inventario', 'citas', 'estados de trabajo', 'registros', 'reportes simples'],
    audience: 'Pequeños negocios que todavía manejan parte de su operación en cuadernos, hojas de cálculo o mensajes dispersos.',
    result: 'Más orden, información centralizada y reducción de trabajo manual.',
    notice: 'Cada sistema se evalúa previamente para determinar si realmente es viable y adecuado para el negocio.',
  },
  {
    number: '04', id: 'automatizacion', title: 'Automatización de procesos',
    description: 'Analizamos tareas repetitivas del negocio y buscamos formas de reducir trabajo manual mediante herramientas digitales.',
    audience: 'Negocios donde se repiten constantemente tareas como registrar información, organizar solicitudes, enviar recordatorios o actualizar estados.',
    result: 'Menos tareas repetitivas, reducción de errores manuales y más tiempo para actividades importantes.',
  },
  {
    number: '05', id: 'diagnostico-digital', title: 'Diagnóstico Digital para negocios',
    description: 'Conocemos cómo trabaja actualmente el negocio, identificamos procesos que pueden simplificarse y proponemos soluciones digitales realistas.',
    audience: 'Negocios que saben que podrían organizarse mejor, pero todavía no saben qué página, sistema o herramienta necesitan.',
    result: 'Una idea más clara de qué vale la pena digitalizar, qué no necesitan y qué solución puede adaptarse a su presupuesto y operación.',
    notice: 'Consulta inicial sin compromiso.', featured: true,
  },
  {
    number: '06', id: 'mantenimiento-web', title: 'Mantenimiento y mejoras web',
    description: 'Realizamos cambios, correcciones y mejoras sobre páginas web existentes o desarrolladas por Lumon.',
    audience: 'Negocios que necesitan actualizar información, fotografías, secciones o realizar ajustes después de una entrega.',
    result: 'Mantener la página actualizada sin tener que reconstruirla desde cero.',
    notice: 'Soporte y cambios según necesidad, sin planes mensuales obligatorios.',
  },
] as const;
