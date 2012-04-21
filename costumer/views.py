from pyramid.view import view_config
from pyramid.httpexceptions import HTTPNotFound
from pyramid.renderers import render

@view_config(route_name='home', renderer='index.html')
def my_view(request):
    return {'project':'costumer'}

@view_config(context='pyramid.httpexceptions.HTTPNotFound')
def html_file_lookup(request):
    return HTTPNotFound()
