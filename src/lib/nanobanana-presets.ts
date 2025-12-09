import { ImageSourcePropType } from 'react-native';

export interface NanoBananaPreset {
  id: string;
  title: string;
  description: string;
  prompt: string;
  preview: ImageSourcePropType;
}

export const NANO_BANANA_PRESETS: NanoBananaPreset[] = [
  {
    id: 'desk-sculpt-display',
    title: 'Desk Sculpt Display',
    description:
      '1/7 scale collectible posed on a clear acrylic base beside a workstation, complete with packaging and modeling process.',
    prompt: `Use the nano-banana model to create a 1/7 scale commercialized figure of the character or object in the illustration, in a realistic style and environment. Place the figure on a computer desk, using a circular transparent acrylic base without any text. On the computer screen, display the ZBrush modeling process of the figure. Next to the computer screen, place a BANDAI-style toy packaging box printed with the original artwork.`,
    preview: require('../../assets/preset-image/preset-model.png'),
  },
  {
    id: 'lego-collector-box',
    title: 'LEGO Collector Box',
    description:
      'Isometric LEGO box featuring the subject and accessories, plus an unpackaged minifig posed alongside.',
    prompt: `Transform the person in the photo into a LEGO minifigure packaging box style, presented in isometric perspective. Label the box with the title "POPCAM". Inside the box, display the LEGO minifigure based on the person in the photo, along with their essential items as LEGO accessories. Beside the box, also display the actual LEGO minifigure itself, unpackaged, rendered in a realistic and vivid style.`,
    preview: require('../../assets/preset-image/preset-model2.png'),
  },
  {
    id: 'cinematic-film-set',
    title: 'Cinematic Film Set',
    description:
      'Drone-style movie set vista capturing film crew, lighting rigs, and the featured character in action.',
    prompt: `Generate an aerial view of this scene as if it was a movie set with a film crew actively filming. Emphasize cinematic lighting equipment, camera cranes, and crew members coordinating around the subject.`,
    preview: require('../../assets/preset-image/preset-model3.png'),
  },
  {
    id: 'dramatic-portrait',
    title: 'Dramatic Portrait',
    description:
      'Vertical 1080x1920 portrait with intense lighting, low angle, and deep crimson backdrop.',
    prompt: `Create a vertical portrait shot in 1080x1920 format using the same face features, with stark cinematic lighting and intense contrast. Capture it from a slightly low upward-facing angle that dramatizes the subject's jawline and neck, evoking quiet dominance against a deep crimson red background contrasted with luminous skin and a dark wardrobe.`,
    preview: require('../../assets/preset-image/preset-model4.png'),
  },
  {
    id: 'paris-balcony-night',
    title: 'Paris Balcony Night',
    description:
      'Foggy Paris skyline with Eiffel Tower glow behind a stylish subject leaning on a balcony.',
    prompt: `Create an ultra-realistic high-resolution photograph of the user posed like the reference image: a stylish man leaning on a Parisian stone balcony at night with the Eiffel Tower glowing warmly through fog in the background. Emphasize a foggy Paris night with a golden-orange cinematic glow, warm ambient street lighting, soft shadows, and a black open blazer outfit.`,
    preview: require('../../assets/preset-image/preset-model5.png'),
  },
  {
    id: 'neon-hero',
    title: 'Neon Hero',
    description:
      'Heroic low-angle portrait framed by pink and orange neon beams over a deep blue gradient.',
    prompt: `Create a realistic heroic low-angle three-quarter shot of the character wearing a purple shirt with glasses, looking into the distance while neon beams in pink and orange curve across the composition. Use a dark blue background that fades to black on the left, and include Apple AirPods Max around the character's neck.`,
    preview: require('../../assets/preset-image/preset-model6.png'),
  },
  {
    id: 'stylized-3d-caricature',
    title: 'Stylized 3D Caricature',
    description:
      'Playful polished 3D take with expressive exaggeration and bold color backdrop.',
    prompt: `Create a highly stylized 3D caricature of the user with expressive facial features and playful exaggeration, rendered in a smooth polished style with clean materials, soft ambient lighting, and a bold color background that highlights the character's charm.`,
    preview: require('../../assets/preset-image/preset-model7.png'),
  },
  {
    id: 'cinematic-portrait',
    title: 'Cinematic Portrait',
    description:
      'Ultra-detailed cinematic portrait with warm tones, shallow depth of field, and confident styling.',
    prompt: `Create a highly detailed cinematic portrait of a handsome man using the uploaded image as reference, emphasizing strong facial features, confident posture, and stylish clothing. Use dramatic lighting, soft shadows, warm tones, shallow depth of field, a moody background, and ultra-realistic textures.`,
    preview: require('../../assets/preset-image/preset-model8.png'),
  },
];

