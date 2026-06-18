// File: src/lib/antd-registry.tsx
'use client';

import React, { useRef, useState } from 'react';
import { createCache, StyleProvider, extractStyle } from '@ant-design/cssinjs';
import { useServerInsertedHTML } from 'next/navigation';

export default function AntdRegistry({ children }: { children: React.ReactNode }) {
  const [cache] = useState(() => createCache());
  const isInserted = useRef(false);

  useServerInsertedHTML(() => {
    if (isInserted.current) {
      return;
    }
    isInserted.current = true;
    return (
      <style
        id="antd"
        dangerouslySetInnerHTML={{ __html: extractStyle(cache, true) }}
      />
    );
  });

  return <StyleProvider cache={cache}>{children}</StyleProvider>;
}
