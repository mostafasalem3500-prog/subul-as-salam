// Static extraction of RQ.* literal data from rafiq data files (parses AST, does NOT execute code)
import * as acorn from 'acorn';
import fs from 'fs';
const [,, outDir, ...files] = process.argv;
const RQ = {};
function lit(n) {
  switch (n.type) {
    case 'Literal': return n.value;
    case 'TemplateLiteral': if (n.expressions.length) throw new Error('tpl expr'); return n.quasis.map(q => q.value.cooked).join('');
    case 'ArrayExpression': return n.elements.flatMap(e => e.type === 'SpreadElement' ? lit(e.argument) : [lit(e)]);
    case 'ObjectExpression': { const o = {}; for (const p of n.properties) { const k = p.key.type === 'Identifier' ? p.key.name : p.key.value; o[k] = lit(p.value); } return o; }
    case 'UnaryExpression': if (n.operator === '-') return -lit(n.argument); break;
    case 'BinaryExpression': if (n.operator === '+') return lit(n.left) + lit(n.right); break;
  }
  throw new Error('non-literal ' + n.type);
}
const name = (m) => m.type === 'MemberExpression' && m.object.type === 'Identifier' && m.object.name === 'RQ' ? m.property.name : null;
for (const f of files) {
  const ast = acorn.parse(fs.readFileSync(f, 'utf8'), { ecmaVersion: 'latest' });
  for (const st of ast.body) {
    if (st.type !== 'ExpressionStatement') continue;
    const e = st.expression;
    try {
      if (e.type === 'AssignmentExpression' && name(e.left)) RQ[name(e.left)] = lit(e.right);
      else if (e.type === 'CallExpression' && e.callee.type === 'MemberExpression' && e.callee.property.name === 'push' && name(e.callee.object)) {
        const k = name(e.callee.object); RQ[k] = RQ[k] || [];
        for (const a of e.arguments) RQ[k].push(...(a.type === 'SpreadElement' ? lit(a.argument) : [lit(a)]));
      }
    } catch (err) { console.error(f, err.message); }
  }
}
fs.mkdirSync(outDir, { recursive: true });
for (const [k, v] of Object.entries(RQ)) { fs.writeFileSync(`${outDir}/${k}.json`, JSON.stringify(v)); console.log(k, Array.isArray(v) ? v.length : typeof v); }
