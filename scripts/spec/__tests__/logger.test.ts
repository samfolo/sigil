import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger, createLogger } from '../lib/logger';

describe('Logger', () => {
  let logger: Logger;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logger = new Logger();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('error', () => {
    it('should log error message with emoji', () => {
      logger.error('Test error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('× Test error');
    });

    it('should increment error count', () => {
      expect(logger.getErrorCount()).toBe(0);
      logger.error('Error 1');
      expect(logger.getErrorCount()).toBe(1);
      logger.error('Error 2');
      expect(logger.getErrorCount()).toBe(2);
    });
  });

  describe('warn', () => {
    it('should log warning message with unicode character', () => {
      logger.warn('Test warning');
      expect(consoleWarnSpy).toHaveBeenCalledWith('⚠  Test warning');
    });

    it('should not increment error count', () => {
      logger.warn('Warning');
      expect(logger.getErrorCount()).toBe(0);
    });
  });

  describe('success', () => {
    it('should log success message with emoji', () => {
      logger.success('Test success');
      expect(consoleLogSpy).toHaveBeenCalledWith('✓ Test success');
    });
  });

  describe('info', () => {
    it('should log info message with unicode character', () => {
      logger.info('Test info');
      expect(consoleLogSpy).toHaveBeenCalledWith('ℹ  Test info');
    });
  });

  describe('hasErrors', () => {
    it('should return false when no errors', () => {
      expect(logger.hasErrors()).toBe(false);
    });

    it('should return true after logging errors', () => {
      logger.error('Test error');
      expect(logger.hasErrors()).toBe(true);
    });
  });

  describe('reset', () => {
    it('should reset error count', () => {
      logger.error('Error 1');
      logger.error('Error 2');
      expect(logger.getErrorCount()).toBe(2);

      logger.reset();
      expect(logger.getErrorCount()).toBe(0);
      expect(logger.hasErrors()).toBe(false);
    });
  });

  describe('createLogger', () => {
    it('should create a new logger instance', () => {
      const logger1 = createLogger();
      const logger2 = createLogger();

      logger1.error('Error');
      expect(logger1.getErrorCount()).toBe(1);
      expect(logger2.getErrorCount()).toBe(0);
    });
  });
});
