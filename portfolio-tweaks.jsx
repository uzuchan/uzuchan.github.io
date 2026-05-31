// portfolio-tweaks.jsx — Tweaks island for the portfolio.
// Content is static HTML; this only sets data-theme / data-density on <html>.

const PORTFOLIO_TWEAKS = /*EDITMODE-BEGIN*/{
  "theme": "paper",
  "density": "regular"
}/*EDITMODE-END*/;

function PortfolioTweaks() {
  const [t, setTweak] = useTweaks(PORTFOLIO_TWEAKS);

  React.useEffect(() => {
    document.documentElement.dataset.theme = t.theme;
  }, [t.theme]);
  React.useEffect(() => {
    document.documentElement.dataset.density = t.density;
  }, [t.density]);

  return (
    <TweaksPanel>
      <TweakSection label="Color theme" />
      <TweakRadio label="配色" value={t.theme}
        options={[
          { value: 'paper',  label: 'Paper' },
          { value: 'mono',   label: 'Mono' },
          { value: 'indigo', label: 'Indigo' },
          { value: 'forest', label: 'Forest' },
        ]}
        onChange={(v) => setTweak('theme', v)} />

      <TweakSection label="Density" />
      <TweakRadio label="情報密度" value={t.density}
        options={[
          { value: 'compact', label: 'Compact' },
          { value: 'regular', label: 'Regular' },
          { value: 'airy',    label: 'Airy' },
        ]}
        onChange={(v) => setTweak('density', v)} />
    </TweaksPanel>
  );
}

ReactDOM.createRoot(document.getElementById('tweaks-root')).render(<PortfolioTweaks />);
