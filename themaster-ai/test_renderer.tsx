import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';

const customRenderer = ({ rows, stylesheet, useInlineStyles }: any) => {
  return rows.map((row: any, i: number) => {
    return (
      <span key={i} className={row.properties?.className?.join(' ')} style={useInlineStyles && row.properties?.className ? stylesheet[row.properties.className[0]] : {}}>
        {row.children.map((child: any, j: number) => {
          if (child.type === 'text') {
            return child.value;
          }
          return (
            <span key={j} className={child.properties?.className?.join(' ')} style={useInlineStyles && child.properties?.className ? stylesheet[child.properties.className[0]] : {}}>
              {child.children ? child.children.map((c: any) => c.value).join('') : child.value}
            </span>
          );
        })}
      </span>
    );
  });
};

export const Test = () => {
  return (
    <SyntaxHighlighter renderer={customRenderer}>
      const a = 1;
    </SyntaxHighlighter>
  );
};
