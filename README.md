# MYX Backend Challenge Project
Nqmah kakvo da pravq

# How to install
`git clone https://github.com/AlexOgn/MYX.git`  
`npm install`  
`node .`  

# How to test
## Personally used Postman, works with anything

# Endpoints
`/uploadImage (Success - 200, Error - 400)`  
`/getImage?image=asdf.jpeg (Success - asdf.jpeg, Not Found - 404)`  
`/deleteImage?image=asdf.jpeg (Success - 200, Error(during deletion) - 400, Not Found - 404)`  
`/getThumbnail?image=asdf.jpeg (Success - _asdf.jpeg, Not Found - 404`)  
`/box?lat1=35&lon1=30&lat2=50&lon2=20 (Success - ['asdf.jpeg', 'asdf1.jpeg'])`  
> /box accepts lat&lon of 2 opposite points of the box

