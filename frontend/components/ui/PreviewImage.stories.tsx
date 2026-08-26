import type { Meta, StoryObj } from '@storybook/react';
import { Image, FileText } from 'lucide-react';
import { PreviewImage } from './PreviewImage';

const meta: Meta<typeof PreviewImage> = {
  title: 'UI/PreviewImage',
  component: PreviewImage,
  tags: ['autodocs'],
  argTypes: {
    src: {
      control: 'text',
      description: 'Image source URL',
    },
    alt: {
      control: 'text',
      description: 'Alt text for the image',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes',
    },
  },
};

export default meta;
type Story = StoryObj<typeof PreviewImage>;

export const WithImage: Story = {
  args: {
    src: 'https://picsum.photos/400/300',
    alt: 'Sample property image',
    fallbackIcon: Image,
    className: 'w-64 h-48 rounded-lg',
  },
};

export const Fallback: Story = {
  args: {
    src: null,
    alt: 'No image available',
    fallbackIcon: Image,
    className: 'w-64 h-48 rounded-lg',
  },
};

export const FileFallback: Story = {
  args: {
    src: '',
    alt: 'Document preview',
    fallbackIcon: FileText,
    className: 'w-64 h-48 rounded-lg',
  },
};

export const AllStates: Story = {
  render: () => (
    <div className="flex gap-4">
      <PreviewImage
        src="https://picsum.photos/200/150"
        alt="With image"
        fallbackIcon={Image}
        className="w-48 h-36 rounded-lg"
      />
      <PreviewImage
        src={null}
        alt="No image"
        fallbackIcon={Image}
        className="w-48 h-36 rounded-lg"
      />
      <PreviewImage
        src="https://invalid-url-that-will-fail.test/img.jpg"
        alt="Broken image"
        fallbackIcon={FileText}
        className="w-48 h-36 rounded-lg"
      />
    </div>
  ),
};
