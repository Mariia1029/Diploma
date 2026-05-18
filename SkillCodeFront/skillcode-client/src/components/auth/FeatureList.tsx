const FEATURES = [
  { fn: 'ai.generate()', desc: '// генерація завдань' },
  { fn: 'ai.verify()',   desc: '// автоперевірка коду' },
  { fn: 'quiz.run()',    desc: '// тренажери та тести' },
  { fn: 'user.progress()', desc: '// аналіз результатів' },
];

export default function FeatureList() {
  return (
    <div className="features">
      {FEATURES.map(({ fn, desc }) => (
        <div className="feature-row" key={fn}>
          <span className="feature-fn">{fn}</span>
          <span className="feature-desc">{desc}</span>
        </div>
      ))}
    </div>
  );
}
