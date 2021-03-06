"use strict";

const visit = require(`unist-util-visit-parents`);

const parseLineNumberRange = require(`./parse-line-number-range`);

const highlightCode = require(`./highlight-code`);

const addLineNumbers = require(`./add-line-numbers`);

module.exports = ({
  markdownAST
}, {
  classPrefix = `language-`,
  inlineCodeMarker = null,
  aliases = {},
  noInlineHighlight = false,
  showLineNumbers: showLineNumbersGlobal = false
} = {}) => {
  const normalizeLanguage = lang => {
    const lower = lang.toLowerCase();
    return aliases[lower] || lower;
  };

  visit(markdownAST, `code`, node => {
    let language = node.lang;

    let _parseLineNumberRange = parseLineNumberRange(language),
        splitLanguage = _parseLineNumberRange.splitLanguage,
        highlightLines = _parseLineNumberRange.highlightLines,
        showLineNumbersLocal = _parseLineNumberRange.showLineNumbersLocal,
        numberLinesStartAt = _parseLineNumberRange.numberLinesStartAt;

    const showLineNumbers = showLineNumbersLocal || showLineNumbersGlobal;
    language = splitLanguage; // PrismJS's theme styles are targeting pre[class*="language-"]
    // to apply its styles. We do the same here so that users
    // can apply a PrismJS theme and get the expected, ready-to-use
    // outcome without any additional CSS.
    //
    // @see https://github.com/PrismJS/prism/blob/1d5047df37aacc900f8270b1c6215028f6988eb1/themes/prism.css#L49-L54

    let languageName = `text`;

    if (language) {
      languageName = normalizeLanguage(language);
    } // Allow users to specify a custom class prefix to avoid breaking
    // line highlights if Prism is required by any other code.
    // This supports custom user styling without causing Prism to
    // re-process our already-highlighted markup.
    // @see https://github.com/gatsbyjs/gatsby/issues/1486


    const className = `${classPrefix}${languageName}`;
    let numLinesStyle, numLinesClass, numLinesNumber;
    numLinesStyle = numLinesClass = numLinesNumber = ``;

    if (showLineNumbers) {
      numLinesStyle = ` style="counter-reset: linenumber ${numberLinesStartAt - 1}"`;
      numLinesClass = ` line-numbers`;
      numLinesNumber = addLineNumbers(node.value);
    } // Replace the node with the markup we need to make
    // 100% width highlighted code lines work


    node.type = `html`;
    let highlightClassName = `gatsby-highlight`;
    if (highlightLines && highlightLines.length > 0) highlightClassName += ` has-highlighted-lines`; // prettier-ignore

    node.value = `` + `<div class="${highlightClassName}" data-language="${languageName}">` + `<pre${numLinesStyle} class="${className}${numLinesClass}">` + `<code class="${className}">` + `${highlightCode(languageName, node.value, highlightLines, noInlineHighlight)}` + `</code>` + `${numLinesNumber}` + `</pre>` + `</div>`;
  });

  if (!noInlineHighlight) {
    visit(markdownAST, `inlineCode`, (node, ancestors) => {
      const [ parent ] = ancestors.slice(-1);
      
      let languageName = `text`;

      if (inlineCodeMarker) {
        let _node$value$split = node.value.split(`${inlineCodeMarker}`, 2),
            language = _node$value$split[0],
            restOfValue = _node$value$split[1];

        if (language && restOfValue) {
          languageName = normalizeLanguage(language);
          node.value = restOfValue;
        }
      }

      const className = `${classPrefix}${languageName}`;

      if (parent.type === `heading`) {
        if (!node.data) node.data = {};
        node.data.hProperties = { className: [className] }
      }
      else {
        node.type = `html`;
        node.value = `<code class="${className}">${highlightCode(languageName, node.value)}</code>`;
      }
    });
  }
};