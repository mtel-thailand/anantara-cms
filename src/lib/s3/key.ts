export const buildStorageKey = (filename: string) => {
  const CMS_FOLDER = process.env.CMS_FOLDER;
  return `${CMS_FOLDER}/${filename}`;
};
