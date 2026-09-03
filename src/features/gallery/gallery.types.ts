export type GalleryGroup = {
  id: string;
  name: string;
  nameIt: string;
  persisted: boolean;
  removed: boolean;
  sequence: number;
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
