import { readFileSync, writeFileSync } from 'node:fs';
const files = ['forms-admin', 'forms-general', 'forms-resources']
  .map((n) => `src/${n}.jsx`)
  .concat(['Admin', 'Community', 'Grades', 'Notes', 'Study'].map((n) => `src/pages/${n}.jsx`));
for (const file of files) {
  let code = readFileSync(file, 'utf8');
  if (!code.includes('<select')) continue;
  code = code.replace(/<select\b/g, '<Select').replace(/<\/select>/g, '</Select>');
  if (!code.includes('import Select from'))
    code =
      `import Select from '${file.includes('/pages/') ? '../' : './'}components/Select';\n` + code;
  writeFileSync(file, code);
}
