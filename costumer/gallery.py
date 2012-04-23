import os
import logging
import pkg_resources
import Image, ImageOps

log = logging.getLogger(__name__)

class Photo(object):

    _CACHE = {}
    
    cache_root = ''
    cache_url = ''
    
    @classmethod
    def set_cache_url(cls, url):
        if url[-1] != '/': url = "%s/" % url
        cls.cache_url = url
        
    def __init__(self, filename, dirname, request):
        self.request = request
        self.filename = filename
        self.dirname = dirname
        self.fullpath = os.path.join(dirname, filename)
        
    def cache_photo(func):
        '''
            Cache photo on instance memory level
        '''
        def wrap(self, width, height, save_ratio = False):
            cached = self._CACHE.get((width, height, save_ratio))
            if not cached:
                cached = func(width, height, save_ratio)
                self._CACHE[(width, height, save_ratio)] = cached
            return cached
        
    def resized(self, width, height, save_ratio = False):
        img = Image.open(self.fullpath)
        resized_name = "%s_%s_%s" % (width, height, self.filename)
        if save_ratio: resized_name = "_fit_%s" % resized_name
        cached_path = os.path.join(self.cache_root, resized_name)
        if save_ratio:
            img.thumbnail((width, height), Image.ANTIALIAS)
        else:
            img = ImageOps.fit(img, (width, height), Image.ANTIALIAS, 0, (0.5, 0.5))
        img.save(cached_path)
        
        return self.request.static_url("%s%s" % (self.cache_url, resized_name))

        
class GalleryTree(list):
    
    root_dir = ''
        
    def __init__(self, request, base_dir = None):
        '''
            Recursive init to build gallery tree from base dir    
        '''
        self.request = request
        
        def is_image(filename):
            '''
                Validate if current file is image by file extansions
            '''
            file_name, file_ext = os.path.splitext(filename)
            file_ext = file_ext[1:]
            return file_ext.lower() in ['jpeg', 'jpg', 'png', 'tiff', 'gif', 'apng']

        if not base_dir:
            self.base_dir = self.root_dir
        else:
            self.base_dir = base_dir
            
        self.dirs = []
        self.photos = []
        
        dir_items = os.listdir(self.base_dir)
        dir_items.sort()
        for  item in dir_items:
            # First skip all files begin on underscore
            if item[0] == '_':
                continue
            if is_image(item):
                self.photos.append(Photo(item, self.base_dir, request))
            else:
                dir_path = os.path.join(self.base_dir, item)
                self.append(GalleryTree(request, dir_path))

    def __repr__(self):
        return "<GallerryTree[%s]:%s>" % (os.path.split(self.base_dir)[-1], super(GalleryTree, self).__repr__()) 

def init_gallery_tree(request):
    return GalleryTree(request)

def includeme(config):
    root_dir = config.registry.settings.get('gallery.dir', '')
    cache_root = config.registry.settings.get('gallery.cache', '')
    if not root_dir:
        raise Exception('Base dir for gallery is not specified')
    if root_dir.find(':') != -1:
        module, path = root_dir.split(':')
        root_dir = pkg_resources.resource_filename(module, path)
    if not cache_root:
        cache_root = os.path.join(root_dir, '_cache')
    if cache_root.find(':') != -1:
        Photo.set_cache_url(cache_root) # use dir as url
        module, path = cache_root.split(':')
        cache_root = pkg_resources.resource_filename(module, path)
    else:
        cache_url = config.registry.settings.get('gallery.cache.url', '')
        if not cache_url:
            raise Exception('Cache base url must beenspecified')
        Photo.set_cache_url(cache_url)
    # Check if root_dir exists
    if not os.path.exists(root_dir):
        os.mkdir(root_dir)
    if not os.path.exists(cache_root):
        os.mkdir(cache_root)
    
    GalleryTree.root_dir = root_dir
    Photo.cache_root = cache_root
    
    config.set_request_property(init_gallery_tree, 'gallery_tree', reify=True)
