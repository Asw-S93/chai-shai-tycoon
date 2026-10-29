/* eslint-disable @typescript-eslint/no-require-imports */
import type React from 'react';

// Mock Skia components for Jest unit/integration/UI tests
jest.mock('@shopify/react-native-skia', () => {
  const mockReact = require('react');
  const { View: mockView } = require('react-native');
  const MockSkiaContainer = ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
  }) => mockReact.createElement(mockView, props, children);

  return {
    Canvas: MockSkiaContainer,
    Group: MockSkiaContainer,
    Rect: MockSkiaContainer,
    RoundedRect: MockSkiaContainer,
    Circle: MockSkiaContainer,
    Path: MockSkiaContainer,
    Skia: {
      Path: {
        MakeFromSVGString: (svg: string) => svg,
      },
    },
  };
});

// Mock expo-sqlite for Jest environment where NativeDatabase C++ binding is absent
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn().mockResolvedValue({
    execAsync: jest.fn().mockResolvedValue(undefined),
    runAsync: jest.fn().mockResolvedValue(undefined),
    getFirstAsync: jest.fn().mockResolvedValue(null),
    getAllAsync: jest.fn().mockResolvedValue([]),
    withTransactionAsync: jest.fn().mockImplementation(async (cb: () => Promise<void>) => {
      await cb();
    }),
  }),
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

// Mock expo-router
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
  }),
  Stack: Object.assign(
    ({ children }: { children?: React.ReactNode }) => children,
    { Screen: () => null }
  ),
}));
