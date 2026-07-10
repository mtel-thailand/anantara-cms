export const buildStorageKey = (filename: string, folder?: "client") => {
  if (folder === "client") {
    const CLIENT_FOLDER = process.env.AWS_S3_CLIENT_FOLDER;
    return `${CLIENT_FOLDER}/${filename}`;
  }

  const CMS_FOLDER = process.env.AWS_S3_CMS_FOLDER;
  return `${CMS_FOLDER}/${filename}`;
};
