// Config do Tailwind (antes ficava inline no HTML, para o Play CDN). Usada só por tools/build-css.mjs.
// "content" aponta para uma cópia do HTML sem o CSS já embutido (senão as classes do CSS gerado
// se realimentariam a cada build).
module.exports = {
  content: [process.env.DEVUI_TW_SCAN || './devUI-Studio.html'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      colors: {
        figma: {
          bg: '#141416',
          viewport: '#19191d',
          panel: '#1e1e24',
          panelDark: '#16161a',
          hover: '#282832',
          border: '#2e2e38',
          borderLight: '#3f3f4e',
          accent: '#0d99ff',
          accentHover: '#0085e6',
          text: '#f3f4f6',
          muted: '#9ca3af',
          danger: '#f43f5e',
          success: '#10b981',
          warning: '#f59e0b'
        }
      }
    }
  }
};
