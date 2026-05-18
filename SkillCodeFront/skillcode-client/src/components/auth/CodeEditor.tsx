export default function CodeEditor() {
  return (
    <div className="code-editor">
      <div className="code-editor-bar">
        <div className="dot dot-r" />
        <div className="dot dot-y" />
        <div className="dot dot-g" />
        <span className="code-filename">skillcode_ai.py</span>
      </div>
      <div className="code-body">
        <div className="code-line"><span className="ln">1</span><span className="c"># SkillCode — AI Engine</span></div>
        <div className="code-line"><span className="ln">2</span><span className="k">from</span>&nbsp;<span className="v">skillcode</span>&nbsp;<span className="k">import</span>&nbsp;<span className="f">ai</span><span className="p">,</span>&nbsp;<span className="f">tasks</span></div>
        <div className="code-line"><span className="ln">3</span></div>
        <div className="code-line"><span className="ln">4</span><span className="v">task</span>&nbsp;<span className="p">=</span>&nbsp;<span className="f">ai</span><span className="p">.</span><span className="f">generate</span><span className="p">(</span></div>
        <div className="code-line"><span className="ln">5</span>&nbsp;&nbsp;&nbsp;&nbsp;<span className="n">lang</span>&nbsp;&nbsp;&nbsp;<span className="p">=</span>&nbsp;<span className="s">"python"</span><span className="p">,</span></div>
        <div className="code-line"><span className="ln">6</span>&nbsp;&nbsp;&nbsp;&nbsp;<span className="n">topic</span>&nbsp;&nbsp;<span className="p">=</span>&nbsp;<span className="s">"loops"</span></div>
        <div className="code-line"><span className="ln">7</span><span className="p">)</span></div>
        <div className="code-line"><span className="ln">8</span></div>
        <div className="code-line"><span className="ln">9</span><span className="v">result</span>&nbsp;<span className="p">=</span>&nbsp;<span className="f">tasks</span><span className="p">.</span><span className="f">check</span><span className="p">(</span></div>
        <div className="code-line"><span className="ln">10</span>&nbsp;&nbsp;&nbsp;&nbsp;<span className="n">answer</span>&nbsp;<span className="p">=</span>&nbsp;<span className="v">user_input</span><span className="p">,</span></div>
        <div className="code-line"><span className="ln">11</span>&nbsp;&nbsp;&nbsp;&nbsp;<span className="n">task</span>&nbsp;&nbsp;&nbsp;<span className="p">=</span>&nbsp;<span className="v">task</span></div>
        <div className="code-line"><span className="ln">12</span><span className="p">)</span></div>
        <div className="code-line"><span className="ln">13</span><span className="c"># ✓ Вірно! 98/100 балів</span></div>
      </div>
    </div>
  );
}
