import { EditorPage } from './pages/EditorPage';
import { GalleryPage } from './pages/GalleryPage';
import { HomePage } from './pages/HomePage';
import { useRoute } from './utils/router';

/** Top-level page switch. Routes: `#/` library, `#/editor/:id` painting studio, `#/gallery` art browser. */
export function App() {
  const route = useRoute();
  const [page, id] = route.path;

  switch (page) {
    case 'editor':
      return id ? <EditorPage key={id} id={id} /> : <HomePage />;
    case 'gallery':
      return <GalleryPage route={route} />;
    default:
      return <HomePage />;
  }
}
