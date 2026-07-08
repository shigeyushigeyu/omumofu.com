const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if (k.trim() && !k.trim().startsWith('#')) {
    acc[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
  }
  return acc;
}, {});
fs.writeFileSync('secrets.json', JSON.stringify(env));
console.log("✅ secrets.json を生成しました");
