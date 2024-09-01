// eslint-disable-next-line no-undef
module.exports = {
    printWidth: 100,
    tabWidth: 4,
    useTabs: false,
    semi: true,
    singleQuote: false,
    quoteProps: "as-needed",
    trailingComma: "es5",
    bracketSpacing: true,
    arrowParens: "always",
    overrides: [
        {
            files: "*.sol",
            options: {
                parser: "solidity-parse",
                printWidth: 120,
            },
        },
        {
            files: "*.yaml",
            options: {
                tabWidth: 2,
            },
        },
    ],
    plugins: ["prettier-plugin-solidity"],
};
