import os
import md5
import logging
import pkg_resources
import Image, ImageOps

from pyramid.view import view_config
from pyramid.httpexceptions import HTTPFound

log = logging.getLogger(__name__)

@view_config(route_name="lazy_resize")
def lazy_photo_resize(request):
    width = int(request.matchdict.get('width'))
    height = int(request.matchdict.get('height'))
    photo_id = request.matchdict.get('photo_id')
    save_ratio = int(request.matchdict.get('save_ratio'))
    
    photo = Photo.get(photo_id, request)
    return HTTPFound(photo.resized(width, height, bool(save_ratio)))


class Photo(object):

    _CACHE = {}
    _CACHED_PHOTOS = {}
    
    cache_root = ''
    cache_url = ''
    _id = 0
    
    @classmethod
    def set_cache_url(cls, url):
        if url[-1] != '/': url = "%s/" % url
        cls.cache_url = url
        
    @classmethod
    def get(cls, id_, request):
        filename, dirname = cls._CACHED_PHOTOS.get(id_)
        return cls(filename, dirname, request)
    
    def __init__(self, filename, dirname, request):
        self.request = request
        self.filename = filename
        self.dirname = dirname
        self.fullpath = os.path.join(dirname, filename)
        self.id = md5.md5(self.fullpath).hexdigest()
        self._CACHED_PHOTOS[self.id] = (filename, dirname)
        
    def original(self):
        return self.lazy_resize(1600, 1600, True)
        
    def cache_photo(func):
        '''
            Cache photo on instance memory level
        '''
        def wrap(self, width, height, save_ratio = False):
            cached = self._CACHE.get((self.filename, width, height, save_ratio))
            if not cached:
                cached = func(self, width, height, save_ratio)
                self._CACHE[(self.filename, width, height, save_ratio)] = cached
            return cached
        return wrap
    
    def lazy_resize(self, width, height, save_ratio = False):
        return self.request.route_url('lazy_resize', width=width, height=height, photo_id=self.id, save_ratio=int(save_ratio))

    @cache_photo
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
    
    ## add some routes there
    config.add_route('lazy_resize', '/photo/resize/{width}/{height}/{photo_id}/{save_ratio}/')
