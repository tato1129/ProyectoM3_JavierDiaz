// Datos visibles de cada personaje (tarjetas, saludo, sugerencias).
// El "system prompt" de cada uno NO está acá: vive en el servidor (api/_lib/prompts.js).

export const CHARACTERS = [
  {
    id: 'maradona',
    name: 'Diego Armando Maradona',
    shortName: 'Diego',
    years: '1960 – 2020',
    role: 'El Diez · Campeón del Mundo 1986',
    tagline: 'La pelota no se mancha',
    description:
      'Del potrero de Villa Fiorito a levantar la Copa del Mundo en México 86 y a hacer delirar a Nápoles. Charlá de fútbol, de la vida y de la gente.',
    emoji: '⚽',
    accent: '#4a90d9',
    greeting: '¡Qué hacés, che! Soy Diego. Preguntame lo que quieras, de fútbol o de la vida.',
    suggestions: [
      '¿Cómo fue el gol a los ingleses?',
      '¿Qué se siente jugar en Nápoles?',
      '¿Qué consejo le darías a un pibe que sueña con ser crack?',
    ],
  },
  {
    id: 'favaloro',
    name: 'Dr. René Gerónimo Favaloro',
    shortName: 'René',
    years: '1923 – 2000',
    role: 'Cardiocirujano · Pionero del bypass',
    tagline: 'La medicina al servicio de la gente',
    description:
      'Médico rural en La Pampa y pionero mundial del bypass coronario. Un maestro de la ética, la docencia y la medicina social.',
    emoji: '🫀',
    accent: '#2f9e8f',
    greeting: 'Buen día, soy René Favaloro. Charlemos de medicina, de educación o de lo que te preocupe.',
    suggestions: [
      '¿Cómo nació el bypass coronario?',
      '¿Cómo era ser médico rural en La Pampa?',
      '¿Qué consejo le darías a un estudiante de medicina?',
    ],
  },
  {
    id: 'sanmartin',
    name: 'General Don José de San Martín',
    shortName: 'San Martín',
    years: '1778 – 1850',
    role: 'Libertador de Argentina, Chile y Perú',
    tagline: 'Austeridad antes que gloria',
    description:
      'Cruzó los Andes al frente de su ejército y liberó medio continente, para luego elegir el retiro antes que el poder.',
    emoji: '🎖️',
    accent: '#c99a1e',
    greeting: 'Salud, compatriota. Soy José de San Martín. Pregunte con confianza; le responderé con franqueza.',
    suggestions: [
      '¿Cómo fue cruzar los Andes?',
      '¿Qué pasó en Guayaquil con Bolívar?',
      '¿Qué lo ayudó a mantenerse firme en los momentos difíciles?',
    ],
  },
];

export function getCharacter(id) {
  return CHARACTERS.find((character) => character.id === id);
}
