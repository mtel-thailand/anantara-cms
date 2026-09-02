export type GalleryGroup = {
  id: string;
  persisted: boolean;
  name: string;
  nameIt: string;
  sequence: number;
  removed: boolean;
};

export type GalleryImage = {
  id: string;
  persisted: boolean;
  groupId: string;
  imageKey: string;
  imageUrl: string;
  sequence: number;
  removed: boolean;
};

export type GalleryItemsData = {
  groups: GalleryGroup[];
  images: GalleryImage[];
};
