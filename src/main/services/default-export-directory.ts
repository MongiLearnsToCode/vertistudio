import { ExportDirectory } from './export-directory';
import { settingsStore } from './settings-store';
import { fsService } from './fs-service';

export const exportDirectory = new ExportDirectory(
  () => settingsStore.get('videoOutputDirectory'),
  (directory) => settingsStore.set('videoOutputDirectory', directory),
  (directory) => fsService.isAllowed(directory),
  (directory) => fsService.bless(directory),
);
