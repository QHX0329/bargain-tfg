/**
 * Tests for webExport utilities: downloadFile, copyToClipboard, buildCsv, todayStamp.
 * Validates Platform.OS guards, CSV injection escaping, and clipboard fallback.
 *
 * @jest-environment jsdom
 */

import { Platform } from 'react-native';
import {
  downloadFile,
  copyToClipboard,
  buildCsv,
  todayStamp,
} from '@/utils/webExport';

// ── downloadFile tests ───────────────────────────────────────────────────────

describe('downloadFile', () => {
  let clickMock: jest.Mock;
  let anchorStub: { href: string; download: string; click: jest.Mock };
  let createElementSpy: jest.SpyInstance;
  let createObjectURLSpy: jest.SpyInstance;
  let revokeObjectURLSpy: jest.SpyInstance;

  beforeEach(() => {
    clickMock = jest.fn();
    anchorStub = { href: '', download: '', click: clickMock };

    createElementSpy = jest
      .spyOn(document, 'createElement')
      .mockImplementation((tag: string) => {
        if (tag === 'a') return anchorStub as unknown as HTMLElement;
        return document.createElement(tag);
      });

    createObjectURLSpy = jest
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:mock-url');
    revokeObjectURLSpy = jest.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('on web: sets download attribute and calls click', () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', writable: true, configurable: true });
    downloadFile('x', 'bargain-lista-2026-06-01.txt', 'text/plain');
    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(anchorStub.download).toBe('bargain-lista-2026-06-01.txt');
    expect(clickMock).toHaveBeenCalledTimes(1);
    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalled();
  });

  it('on ios: does NOT touch document (no-op)', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true, configurable: true });
    const result = downloadFile('x', 'bargain-lista-2026-06-01.txt', 'text/plain');
    expect(result).toBeUndefined();
    expect(createElementSpy).not.toHaveBeenCalled();
    // restore
    Object.defineProperty(Platform, 'OS', { value: 'web', writable: true, configurable: true });
  });
});

// ── copyToClipboard tests ────────────────────────────────────────────────────

describe('copyToClipboard', () => {
  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: 'web', writable: true, configurable: true });
    jest.restoreAllMocks();
  });

  it('on web: resolves true using navigator.clipboard.writeText', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', writable: true, configurable: true });
    const writeTextMock = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(global, 'navigator', {
      value: { clipboard: { writeText: writeTextMock } },
      writable: true,
      configurable: true,
    });
    const result = await copyToClipboard('hi');
    expect(result).toBe(true);
    expect(writeTextMock).toHaveBeenCalledWith('hi');
  });

  it('on web: falls back to execCommand when clipboard rejects, resolves true', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', writable: true, configurable: true });
    const writeTextMock = jest.fn().mockRejectedValue(new Error('NotAllowed'));
    Object.defineProperty(global, 'navigator', {
      value: { clipboard: { writeText: writeTextMock } },
      writable: true,
      configurable: true,
    });

    const execCommandMock = jest.fn().mockReturnValue(true);
    document.execCommand = execCommandMock;
    jest.spyOn(document.body, 'appendChild').mockImplementation((el) => el);
    jest.spyOn(document.body, 'removeChild').mockImplementation((el) => el);

    const result = await copyToClipboard('fallback-text');
    expect(result).toBe(true);
    expect(execCommandMock).toHaveBeenCalledWith('copy');
  });

  it('on ios: resolves false without touching clipboard', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true, configurable: true });
    const result = await copyToClipboard('ignored');
    expect(result).toBe(false);
  });
});

// ── buildCsv tests ────────────────────────────────────────────────────────────

describe('buildCsv', () => {
  it('prefixes formula-injection cells (=) with a single quote', () => {
    const output = buildCsv(['p'], [['=2+2']]);
    expect(output).toContain("'=2+2");
    expect(output).not.toMatch(/^=2\+2/m);
  });

  it('prefixes formula-injection cells (+) with a single quote', () => {
    const output = buildCsv(['p'], [['+=CMD']]);
    expect(output).toContain("'+=CMD");
  });

  it('prefixes formula-injection cells (-) with a single quote', () => {
    const output = buildCsv(['p'], [['-1+1']]);
    expect(output).toContain("'-1+1");
  });

  it('prefixes formula-injection cells (@) with a single quote', () => {
    const output = buildCsv(['p'], [['@SUM']]);
    expect(output).toContain("'@SUM");
  });

  it('quotes cells containing commas per RFC4180', () => {
    const output = buildCsv(['p'], [['a,b']]);
    expect(output).toContain('"a,b"');
  });

  it('quotes cells containing double-quotes and escapes them', () => {
    const output = buildCsv(['p'], [['say "hi"']]);
    expect(output).toContain('"say ""hi"""');
  });

  it('generates correct CSV with header row and multiple data rows', () => {
    const output = buildCsv(['Name', 'Price'], [['Leche', '1.20'], ['Pan', '0.80']]);
    const lines = output.split('\n');
    expect(lines[0]).toBe('Name,Price');
    expect(lines[1]).toBe('Leche,1.20');
    expect(lines[2]).toBe('Pan,0.80');
  });
});

// ── todayStamp tests ─────────────────────────────────────────────────────────

describe('todayStamp', () => {
  it('returns a YYYY-MM-DD formatted string', () => {
    const stamp = todayStamp();
    expect(stamp).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
