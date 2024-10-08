export default {
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  trailingComma: "es5",
  singleQuote: true,
  arrowParens: "avoid",
  plugins: ["@trivago/prettier-plugin-sort-imports"],
  importOrder: [
    "^react",
    "<THIRD_PARTY_MODULES>",
    "^@shared/(.*)$",
    "^@(app|content-script|inpage|background)/(.*)$",
    "^[./]",
  ],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
};
