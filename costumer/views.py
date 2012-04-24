from pyramid.view import view_config
from pyramid.httpexceptions import HTTPNotFound
from pyramid.renderers import render_to_response

import os
import pkg_resources

@view_config(route_name='home', renderer='index.html')
def my_view(request):
    gallery = request.gallery_tree
    return dict(gallery=gallery)

@view_config(context='pyramid.httpexceptions.HTTPNotFound')
def html_file_lookup(request):
    
    templates_dir = request.registry.settings.get('mako.directories')
    if templates_dir:
        module, path = templates_dir.split(':')
        templates_path = pkg_resources.resource_filename(module, path)
        requested_path = request.path[1:]
        full_path = os.path.join(templates_path, requested_path)
        if os.path.exists(full_path):
            return render_to_response(requested_path, dict(gallery=request.gallery_tree), request)
    
    return HTTPNotFound()
