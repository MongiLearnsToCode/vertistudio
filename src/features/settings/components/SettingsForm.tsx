import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Panel, Button, TextInput } from '@shared/components';
import { displayNameSchema } from '@shared/validation/settings-schema';
import { useSetting } from '@renderer/hooks/useSetting';
import { useToast } from '@renderer/contexts/ToastContext';
import { useLogger } from '@renderer/hooks/useLogger';

const profileFormSchema = z.object({
  displayName: displayNameSchema,
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export function SettingsForm() {
  const [displayName, setDisplayName] = useSetting('displayName');
  const { showToast } = useToast();
  const log = useLogger('SettingsForm');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isValid, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { displayName: '' },
    mode: 'onChange',
  });

  useEffect(() => {
    reset({ displayName });
  }, [displayName, reset]);

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      await setDisplayName(values.displayName);
      reset(values);
      showToast('Profile saved', 'success');
    } catch (err) {
      log.error('save displayName failed', err);
      showToast('Failed to save profile', 'error');
    }
  };

  const error = errors.displayName?.message;

  return (
    <Panel header="Profile">
      <form onSubmit={handleSubmit(onSubmit)} className="p-3 space-y-2" noValidate>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="settings-form-displayName"
            className="text-[12px] text-text-secondary font-medium"
          >
            Display name
          </label>
          <div className="text-[10px] text-text-dim">
            Shown anywhere the app greets you. Validated with the same Zod
            schema that the settings IPC handler uses.
          </div>
          <TextInput
            id="settings-form-displayName"
            size="md"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'settings-form-displayName-error' : undefined}
            {...register('displayName')}
          />
          {error ? (
            <p
              id="settings-form-displayName-error"
              role="alert"
              className="text-[10px] text-accent-red"
            >
              {error}
            </p>
          ) : null}
        </div>
        <div className="flex justify-end pt-1">
          <Button
            type="submit"
            variant="primary"
            disabled={!isDirty || !isValid || isSubmitting}
          >
            {isSubmitting ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
