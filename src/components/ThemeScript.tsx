// Injected inline before hydration to prevent flash of wrong theme.
// Must be a server component so Next.js places it in <head>.
export default function ThemeScript() {
  return (
    <script
      id="vibro-theme-init"
      dangerouslySetInnerHTML={{
        __html: `(function(){try{var t=localStorage.getItem('vibro_theme')||'dark';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`,
      }}
    />
  )
}
