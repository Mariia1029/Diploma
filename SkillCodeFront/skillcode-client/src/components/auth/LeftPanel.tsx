import Logo from './Logo';
import CodeEditor from './CodeEditor';
import FeatureList from './FeatureList';

export default function LeftPanel() {
  return (
    <div className="panel-left">
      <div>
        <Logo />
        <div className="tagline">// платформа для вивчення мов програмування</div>
      </div>
      <CodeEditor />
      <FeatureList />
    </div>
  );
}
