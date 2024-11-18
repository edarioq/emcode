import matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { afterEach, expect } from 'vitest';

expect.extend(matchers);

afterEach(() => {
 cleanup();
});

// Add type definitions
declare module 'vitest' {
 interface Assertion<T> {
   toBeInTheDocument(): T;
   toHaveClass(className: string): T;
   toHaveStyle(style: Record<string, string>): T;
 }
}
