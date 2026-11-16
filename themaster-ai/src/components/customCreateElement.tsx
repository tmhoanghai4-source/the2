import React from 'react';

export function customCreateElement({ node, stylesheet, style, useInlineStyles, key }: any) {
  const { properties, type, tagName, value } = node;
  if (type === 'text') {
    return value;
  } else if (tagName) {
    const TagName = tagName;
    const childrenCreator = (children: any[]) => {
      return children.map((child, i) =>
        customCreateElement({
          node: child,
          stylesheet,
          useInlineStyles,
          key: `code-segment-${i}`
        })
      );
    };
    
    const props: any = {
      key,
      ...properties,
    };
    
    if (properties?.className) {
      props.className = properties.className.join(' ');
    }
    
    if (useInlineStyles) {
      const className = properties?.className;
      if (className && className.length > 0) {
        props.style = className.reduce((acc: any, cn: string) => {
          return { ...acc, ...(stylesheet[cn] || {}) };
        }, style || {});
      } else {
        props.style = style || {};
      }
    }
    
    return (
      <TagName {...props}>
        {node.children ? childrenCreator(node.children) : null}
      </TagName>
    );
  }
}

export const customRenderer = ({ rows, stylesheet, useInlineStyles }: any) => {
  return (
    <>
      {rows.map((node: any, i: number) => {
        return customCreateElement({
          node,
          stylesheet,
          useInlineStyles,
          key: `code-seg-${i}`
        });
      })}
    </>
  );
};
