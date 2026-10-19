import { describe, expect, it, vi } from 'vitest';
import { UpdateController } from '../update-controller';
function setup(disabled?: string) {
  const driver = {
    check: vi.fn(async () => {}),
    download: vi.fn(async () => {}),
    install: vi.fn(),
    setAutomatic: vi.fn(),
  };
  let safe = true;
  const controller = new UpdateController(driver, '0.1.0', disabled, vi.fn(), () => safe);
  return {
    controller,
    driver,
    block: () => {
      safe = false;
    },
  };
}
describe('Release updates', () => {
  it('checks unsigned macOS releases while keeping native automatic installation disabled', async () => {
    const driver = {
      check: vi.fn(async () => {}),
      download: vi.fn(async () => {}),
      install: vi.fn(),
      setAutomatic: vi.fn(),
    };
    const controller = new UpdateController(
      driver,
      '0.1.0',
      undefined,
      vi.fn(),
      () => true,
      'https://downloads.test/download/mac-arm64',
    );
    driver.check.mockImplementation(async () => {
      controller.available('0.2.0');
    });
    controller.configure(true);
    await controller.check();
    expect(driver.check).toHaveBeenCalledOnce();
    expect(driver.download).not.toHaveBeenCalled();
    expect(driver.setAutomatic).toHaveBeenLastCalledWith(false);
    expect(controller.state.status).toBe('available');
    await expect(controller.download()).rejects.toThrow('website');
    expect(() => controller.install()).toThrow('signed release');
  });

  it('checks without downloading until the user opts in', async () => {
    const { controller, driver } = setup();
    driver.check.mockImplementation(async () => {
      controller.available('0.2.0');
    });
    await controller.check();
    expect(controller.state.status).toBe('available');
    expect(driver.download).not.toHaveBeenCalled();
    await controller.download();
    expect(driver.download).toHaveBeenCalledOnce();
  });
  it('automatically downloads when enabled, but never restarts during a download', async () => {
    const { controller, driver } = setup();
    controller.configure(true);
    driver.check.mockImplementation(async () => {
      controller.available('0.2.0');
    });
    driver.download.mockImplementation(async () => {
      controller.progress(40);
      controller.downloaded('0.2.0');
    });
    await controller.check();
    expect(driver.download).toHaveBeenCalledOnce();
    expect(driver.install).not.toHaveBeenCalled();
    expect(controller.state.status).toBe('downloaded');
    controller.install();
    expect(driver.install).toHaveBeenCalledOnce();
  });
  it('blocks installation until downloaded and while exports are active', () => {
    const { controller, driver, block } = setup();
    expect(() => controller.install()).toThrow('Download');
    controller.downloaded('0.2.0');
    block();
    expect(() => controller.install()).toThrow('exports');
    expect(driver.install).not.toHaveBeenCalled();
  });
  it('keeps offline failures recoverable without blocking editing', async () => {
    const { controller, driver } = setup();
    driver.check.mockRejectedValueOnce(new Error('offline'));
    await expect(controller.check()).rejects.toThrow('offline');
    expect(controller.state.status).toBe('error');
    driver.check.mockImplementation(async () => controller.current());
    await controller.check();
    expect(controller.state.status).toBe('current');
  });
  it('coalesces concurrent checks and keeps a downloaded update ready', async () => {
    const { controller, driver } = setup();
    let finish!: () => void;
    driver.check.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const first = controller.check();
    const second = controller.check();
    expect(driver.check).toHaveBeenCalledOnce();
    controller.current();
    finish();
    await Promise.all([first, second]);
    controller.downloaded('0.2.0');
    await controller.check();
    expect(driver.check).toHaveBeenCalledOnce();
  });
  it('disables updates for development and unsigned macOS installations with a clear reason', async () => {
    const { controller, driver } = setup('Install a signed release.');
    await expect(controller.check()).rejects.toThrow('signed release');
    expect(driver.check).not.toHaveBeenCalled();
    expect(controller.state.status).toBe('disabled');
  });
});
