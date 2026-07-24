type AsyncTaskOptions<TResult> = {
  action: () => Promise<TResult> | TResult;
  onError: (error: unknown) => void | Promise<void>;
  onFinally?: () => void | Promise<void>;
};

export async function runAsyncTask<TResult>({
  action,
  onError,
  onFinally,
}: AsyncTaskOptions<TResult>): Promise<TResult | undefined> {
  try {
    return await action();
  } catch (error) {
    await onError(error);
    return undefined;
  } finally {
    await onFinally?.();
  }
}
