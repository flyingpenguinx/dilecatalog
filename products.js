// Categories with their unique brands - Updated structure based on image naming convention
export const CATEGORIES = [
    { 
        id: 'frozen', 
        name: 'Frozen', 
        icon: '❄️',
        subcategories: ['Pupusa', 'Tamal', 'Atol', 'Fruit', 'Platano'],
        brands: ['Nokal', 'Cuzcatlecos', 'Racor', 'La Ricura', 'Maya']
    },
    { 
        id: 'grocery', 
        name: 'Grocery', 
        icon: '🛒',
        subcategories: ['Chips', 'Pan Galleta', 'Granos', 'Harina', 'Cafe', 'Bebida', 'Salsa', 'Consume', 'Sopa', 'Chocolate', 'Vidro', 'Empanizador', 'Misc'],
        brands: ['Diana', 'Bocadeli', 'Naturas', 'Malher', 'Maggi', 'Racor', 'Dona Lisa', 'Lido', 'Pan Genesis', 'Pan Genisis', 'Sinai', 'Pozuelo', 'McCormick', 'Mccormick', 'Tortrix', 'Chiky', 'Melher', 'Cuzcatlecos', 'Cosecha Nueva', 'Nueva Cosecha', 'Arroz San Francisco', 'Centroamericano', 'Ducal', 'El Migueleno', 'Cafe Quetzal', 'La Jarrillita', 'La Salvadorena', 'La Salvadoreno', 'Lempira', 'Listto', 'Picamas', 'Senorial', 'TC', 'Yummies', 'Alo', 'De la Granja', 'Del Fruto', 'Energy', 'Frito Lays', 'Frusecha', 'Incaparina', 'Dona Blanca', 'El Salvadoreno', 'Sula']
    },
    { 
        id: 'lactos', 
        name: 'Lácteos/Dairy', 
        icon: '🧀',
        subcategories: ['Queso', 'Crema', 'Cuajada'],
        brands: ['La Ricura', 'Cuzcatlecos', 'DLC', 'Cremimex', 'Frusecha']
    },
    { 
        id: 'vitaminas', 
        name: 'Vitaminas', 
        icon: '💊',
        subcategories: ['Crema', 'Kids', 'Liquido'],
        brands: ['Kofal', 'Mariguanol', 'NueroBion', 'nuerobion']
    }
];

// Products organized by category - Generated from image files with Category-Brand-Subcategory-Name pattern
export const PRODUCTS = [
    // ==================== FROZEN ====================
    // Atol
    { id: 1001, name: 'Atol de elote', brand: 'Cuzcatlecos', category: 'frozen', subcategory: 'Atol', description: 'Traditional corn atole drink.', image: 'images/Frozen-Cuzcatlecos-Atol-Atol de elote.jpg' },
    
    // Tamal
    { id: 1002, name: 'Tamales con Jalapenos', brand: 'Cuzcatlecos', category: 'frozen', subcategory: 'Tamal', description: 'Tamales with jalapeño peppers.', image: 'images/Frozen-Cuzcatlecos-Tamal-Tamales con Jalapenos.jpg' },
    { id: 1003, name: 'Tamale Elote Centroamericano', brand: 'Nokal', category: 'frozen', subcategory: 'Tamal', description: 'Central American corn tamale.', image: 'images/Frozen-Nokal-Tamal-Tamale Elote Centroamericano.jpg' },
    
    // Platano
    { id: 1004, name: 'Plantain Slices', brand: 'La Ricura', category: 'frozen', subcategory: 'Platano', description: 'Sweet plantain slices ready to cook.', image: 'images/Frozen-La Ricura-Platano-Plantain Slices.jpg' },
    { id: 1005, name: 'Platano en Tajadas', brand: 'Racor', category: 'frozen', subcategory: 'Platano', description: 'Sliced plantains ready to fry.', image: 'images/Frozen-Racor-Platano-Platano en Tajadas.jpg' },
    
    // Fruit
    { id: 1006, name: 'Maranon', brand: 'Maya', category: 'frozen', subcategory: 'Fruit', description: 'Frozen cashew fruit.', image: 'images/Frozen-Maya-Fruit-Maranon.jpg' },
    { id: 1007, name: 'Arrayan', brand: 'Racor', category: 'frozen', subcategory: 'Fruit', description: 'Frozen arrayan fruit.', image: 'images/Frozen-Racor-Fruit-Arrayan.jpg' },
    { id: 1008, name: 'Jocote Corona', brand: 'Racor', category: 'frozen', subcategory: 'Fruit', description: 'Frozen jocote corona fruit.', image: 'images/Frozen-Racor-Fruit-Jocote Corona.jpg' },
    { id: 1009, name: 'Jocote Rojo', brand: 'Racor', category: 'frozen', subcategory: 'Fruit', description: 'Frozen red jocote fruit.', image: 'images/Frozen-Racor-Fruit-Jocote Rojo.jpg' },
    { id: 1010, name: 'Mango Maduro', brand: 'Racor', category: 'frozen', subcategory: 'Fruit', description: 'Frozen ripe mango.', image: 'images/Frozen-Racor-Fruit-Mango Maduro.jpg' },
    { id: 1011, name: 'Nance', brand: 'Racor', category: 'frozen', subcategory: 'Fruit', description: 'Frozen nance fruit.', image: 'images/Frozen-Racor-Fruit-Nance.jpg' },
    
    // Pupusas - Nokal
    { id: 1012, name: 'Pupusa Arroz Frijol con Queso', brand: 'Nokal', category: 'frozen', subcategory: 'Pupusa', description: 'Rice pupusa with beans and cheese.', image: 'images/Frozen-Nokal-Pupusa-Arroz Frijol con Queso.jpg' },
    { id: 1013, name: 'Pupusa Arroz Queso con Loroco', brand: 'Nokal', category: 'frozen', subcategory: 'Pupusa', description: 'Rice pupusa with cheese and loroco.', image: 'images/Frozen-Nokal-Pupusa-Arroz Queso con Loroco.jpg' },
    { id: 1014, name: 'Pupusa Arroz Revuelta', brand: 'Nokal', category: 'frozen', subcategory: 'Pupusa', description: 'Mixed rice pupusa with beans, cheese and pork.', image: 'images/Frozen-Nokal-Pupusa-Arroz Revuelta.jpg' },
    { id: 1015, name: 'Pupusa Maiz Frijol con Queso', brand: 'Nokal', category: 'frozen', subcategory: 'Pupusa', description: 'Corn pupusa with beans and cheese.', image: 'images/Frozen-Nokal-Pupusa-Maiz Frijol con Queso.jpg' },
    { id: 1016, name: 'Pupusa Maiz Queso Loroco', brand: 'Nokal', category: 'frozen', subcategory: 'Pupusa', description: 'Corn pupusa with cheese and loroco.', image: 'images/Frozen-Nokal-Pupusa-Maiz Queso Loroco.jpg' },
    { id: 1017, name: 'Pupusa Maiz Queso', brand: 'Nokal', category: 'frozen', subcategory: 'Pupusa', description: 'Corn pupusa with cheese.', image: 'images/Frozen-Nokal-pupusa-Maiz Queso.jpg' },
    { id: 1018, name: 'Pupusa Maiz Revuelta', brand: 'Nokal', category: 'frozen', subcategory: 'Pupusa', description: 'Mixed corn pupusa with beans, cheese and pork.', image: 'images/Frozen-Nokal-Pupusa-Maiz Revuelta.jpg' },
    { id: 1019, name: 'Pupusa Maiz Revuelta', brand: 'Nokal', category: 'frozen', subcategory: 'Pupusa', description: 'Traditional mixed corn pupusa.', image: 'images/Frozen-Nokal-Pupusa-Maiz Revuelta(1).jpg' },
    
    // ==================== GROCERY ====================
    // Chips - Bocadeli
    { id: 2001, name: 'Frijoli con Chile', brand: 'Bocadeli', category: 'grocery', subcategory: 'Chips', description: 'Bean chips with chili flavor.', image: 'images/Grocery-Bocadeli-Chips-Frijoli con Chile.jpg' },
    { id: 2002, name: 'Frijoli', brand: 'Bocadeli', category: 'grocery', subcategory: 'Chips', description: 'Bean flavored chips.', image: 'images/Grocery-Bocadeli-Chips-Frijoli.jpg' },
    { id: 2003, name: 'Gustitos Salsa y Queso', brand: 'Bocadeli', category: 'grocery', subcategory: 'Chips', description: 'Cheese puffs with salsa and cheese flavor.', image: 'images/Grocery-Bocadeli-Chips-Gustitos Salsa y Queso.jpg' },
    { id: 2004, name: 'Gustitos', brand: 'Bocadeli', category: 'grocery', subcategory: 'Chips', description: 'Classic cheese puffs.', image: 'images/Grocery-Bocadeli-Chips-Gustitos.jpg' },
    { id: 2005, name: 'Nachos Chile y Limon Xtremo', brand: 'Bocadeli', category: 'grocery', subcategory: 'Chips', description: 'Extreme chili lime nacho chips.', image: 'images/Grocery-Bocadeli-Chips-Nachos Chile y Limon Xtremo.jpg' },
    { id: 2006, name: 'Papa Sitas', brand: 'Bocadeli', category: 'grocery', subcategory: 'Chips', description: 'Potato chips.', image: 'images/Grocery-Bocadeli-Chips-Papa Sitas.jpg' },
    { id: 2007, name: 'Piguis', brand: 'Bocadeli', category: 'grocery', subcategory: 'Chips', description: 'Pork rind flavored snacks.', image: 'images/Grocery-Bocadeli-Chips-Piguis.jpg' },
    { id: 2008, name: 'Quesi Trix Horneado', brand: 'Bocadeli', category: 'grocery', subcategory: 'Chips', description: 'Baked cheese snacks.', image: 'images/Grocery-Bocadeli-Chips-Quesi Trix Horneado.jpg' },
    { id: 2009, name: 'Quesi Trix', brand: 'Bocadeli', category: 'grocery', subcategory: 'Chips', description: 'Cheese flavored snacks.', image: 'images/Grocery-Bocadeli-Chips-Quesi Trix.jpg' },
    { id: 2010, name: 'Trompetas Pizza', brand: 'Bocadeli', category: 'grocery', subcategory: 'Chips', description: 'Pizza flavored trumpet shaped snacks.', image: 'images/Grocery-Bocadeli-Chips-Trompetas Pizza.jpg' },
    
    // Chips - Diana
    { id: 2011, name: 'Bacorns', brand: 'Diana', category: 'grocery', subcategory: 'Chips', description: 'Bacon flavored corn snacks.', image: 'images/Grocery-Diana-Chips-Bacorns.jpg' },
    { id: 2012, name: 'Corn Brights', brand: 'Diana', category: 'grocery', subcategory: 'Chips', description: 'Colorful corn snacks.', image: 'images/Grocery-Diana-chips-corn brights.jpg' },
    { id: 2013, name: 'Corn Chips Hot', brand: 'Diana', category: 'grocery', subcategory: 'Chips', description: 'Hot flavored corn chips.', image: 'images/Grocery-Diana-Chips-Corn Chips Hot.jpg' },
    { id: 2014, name: 'Corn Curls', brand: 'Diana', category: 'grocery', subcategory: 'Chips', description: 'Curly corn snacks.', image: 'images/Grocery-Diana-Chips-Corn Curls.jpg' },
    { id: 2015, name: 'Cornbits', brand: 'Diana', category: 'grocery', subcategory: 'Chips', description: 'Corn bits snacks.', image: 'images/Grocery-Diana-Chips-Cornbits.jpg' },
    { id: 2016, name: 'Jalapenos', brand: 'Diana', category: 'grocery', subcategory: 'Chips', description: 'Jalapeño flavored chips.', image: 'images/Grocery-Diana-Chips-Jalapenos.jpg' },
    { id: 2017, name: 'Maiz Chino Picante', brand: 'Diana', category: 'grocery', subcategory: 'Chips', description: 'Spicy Chinese corn snacks.', image: 'images/Grocery-Diana-Chips-Maiz Chino Picante.jpg' },
    { id: 2018, name: 'Palitos', brand: 'Diana', category: 'grocery', subcategory: 'Chips', description: 'Stick shaped snacks.', image: 'images/Grocery-Diana-Chips-Palitos.jpg' },
    { id: 2019, name: 'Quesitos Cheesteens', brand: 'Diana', category: 'grocery', subcategory: 'Chips', description: 'Cheese flavored teen snacks.', image: 'images/Grocery-Diana-Chips-Quesitos Cheesteens.jpg' },
    
    // Chips - Other Brands
    { id: 2020, name: 'Grujitos Queso y Chile', brand: 'Frito Lays', category: 'grocery', subcategory: 'Chips', description: 'Cheese and chili flavored snacks.', image: 'images/Grocery-Frito Lays-Chips-Grujitos Queso y Chile.jpg' },
    { id: 2021, name: 'Yuca chips con Sal', brand: 'Racor', category: 'grocery', subcategory: 'Chips', description: 'Salted cassava chips.', image: 'images/Grocery-Racor-Chips-Yuca chips con Sal.jpg' },
    { id: 2022, name: 'Tortillitas', brand: 'Senorial', category: 'grocery', subcategory: 'Chips', description: 'Small tortilla chips.', image: 'images/Grocery-Senorial-Chips-Tortillitas.jpg' },
    { id: 2023, name: 'Limon', brand: 'Tortrix', category: 'grocery', subcategory: 'Chips', description: 'Lime flavored chips.', image: 'images/Grocery-Tortrix-Chips-Limon.jpg' },
    { id: 2024, name: 'Anillitos', brand: 'Yummies', category: 'grocery', subcategory: 'Chips', description: 'Ring shaped snacks.', image: 'images/Grocery-Yummies-Chips-Anillitos.jpg' },
    
    // Pan Galleta - Diana
    { id: 2030, name: 'Picnic Fresa', brand: 'Diana', category: 'grocery', subcategory: 'Pan Galleta', description: 'Strawberry picnic cookies.', image: 'images/Grocery-Diana-Pan Galleta-Picnic Fresa.jpg' },
    { id: 2031, name: 'Picnic Vanilla', brand: 'Diana', category: 'grocery', subcategory: 'Pan Galleta', description: 'Vanilla picnic cookies.', image: 'images/Grocery-Diana-Pan Galleta-Picnic Vanilla.jpg' },
    
    // Pan Galleta - Chiky
    { id: 2032, name: 'Chiky Chocolate', brand: 'Chiky', category: 'grocery', subcategory: 'Pan Galleta', description: 'Chocolate Chiky cookies.', image: 'images/Grocery-Chiky-Pan Galleta-Chiky Chocolate.jpg' },
    { id: 2033, name: 'Chiky Fresa', brand: 'Chiky', category: 'grocery', subcategory: 'Pan Galleta', description: 'Strawberry Chiky cookies.', image: 'images/Grocery-Chiky-Pan Galleta-Chiky Fresa.jpg' },
    
    // Pan Galleta - Lido
    { id: 2034, name: 'Alemana', brand: 'Lido', category: 'grocery', subcategory: 'Pan Galleta', description: 'German style cookies.', image: 'images/Grocery-Lido-Pan Galleta-Alemana.jpg' },
    { id: 2035, name: 'Casino', brand: 'Lido', category: 'grocery', subcategory: 'Pan Galleta', description: 'Casino crackers.', image: 'images/Grocery-Lido-Pan Galleta-Casino.jpg' },
    { id: 2036, name: 'Coco Margarita', brand: 'Lido', category: 'grocery', subcategory: 'Pan Galleta', description: 'Coconut margarita cookies.', image: 'images/Grocery-Lido-Pan Galleta-Coco Margarita.jpg' },
    { id: 2037, name: 'Cremosa', brand: 'Lido', category: 'grocery', subcategory: 'Pan Galleta', description: 'Creamy cookies.', image: 'images/Grocery-Lido-Pan Galleta-Cremosa.jpg' },
    { id: 2038, name: 'Suspiros', brand: 'Lido', category: 'grocery', subcategory: 'Pan Galleta', description: 'Light meringue cookies.', image: 'images/Grocery-Lido-Pan Galleta-Suspiros.jpg' },
    { id: 2039, name: 'Jalea', brand: 'Lido', category: 'grocery', subcategory: 'Pan Galleta', description: 'Jelly filled cookies.', image: 'images/Grocery-Lido-Pan Galleta-Jalea.jpg' },
    
    // Pan Galleta - Pan Genesis
    { id: 2040, name: 'Pan Galleta', brand: 'Pan Genesis', category: 'grocery', subcategory: 'Pan Galleta', description: 'Traditional sweet bread cookies.', image: 'images/Grocery-Pan Genesis-Pan Galleta-.jpg' },
    { id: 2041, name: 'Hoja Picsy', brand: 'Pan Genesis', category: 'grocery', subcategory: 'Pan Galleta', description: 'Leaf shaped puff pastry.', image: 'images/Grocery-Pan Genesis-Pan Galleta-Hoja Picsy.jpg' },
    { id: 2042, name: 'Margarita Jalea', brand: 'Pan Genesis', category: 'grocery', subcategory: 'Pan Galleta', description: 'Margarita cookies with jelly.', image: 'images/Grocery-Pan Genesis-Pan Galleta-Margarita Jalea.jpg' },
    { id: 2043, name: 'Salpor Almidon', brand: 'Pan Genesis', category: 'grocery', subcategory: 'Pan Galleta', description: 'Starch-based salpor cookies.', image: 'images/Grocery-Pan Genesis-Pan Galleta-Salpor Almidon.jpg' },
    
    // Pan Galleta - Pan Genisis (alternate spelling)
    { id: 2044, name: 'Pan Galleta 1', brand: 'Pan Genisis', category: 'grocery', subcategory: 'Pan Galleta', description: 'Sweet bread cookies.', image: 'images/Grocery-Pan Genisis-Pan galleta-1.jpg' },
    { id: 2045, name: 'Almendrada', brand: 'Pan Genisis', category: 'grocery', subcategory: 'Pan Galleta', description: 'Almond flavored cookies.', image: 'images/Grocery-Pan Genisis-Pan Galleta-Almendrada.jpg' },
    { id: 2046, name: 'Carita', brand: 'Pan Genisis', category: 'grocery', subcategory: 'Pan Galleta', description: 'Face-shaped vanilla cookies.', image: 'images/Grocery-Pan Genisis-Pan Galleta-Carita.jpg' },
    { id: 2047, name: 'Hojitas Picsy', brand: 'Pan Genisis', category: 'grocery', subcategory: 'Pan Galleta', description: 'Small leaf shaped pastries.', image: 'images/Grocery-Pan Genisis-Pan Galleta-Hojitas Picsy.jpg' },
    
    // Pan Galleta - Sinai
    { id: 2048, name: 'Margarita', brand: 'Sinai', category: 'grocery', subcategory: 'Pan Galleta', description: 'Traditional margarita cookies.', image: 'images/Grocery-Sinai-Pan Galleta-Margarita.jpg' },
    { id: 2049, name: 'Maria Luisa', brand: 'Sinai', category: 'grocery', subcategory: 'Pan Galleta', description: 'Maria Luisa layer cake.', image: 'images/Grocery-Sinai-Pan Galleta-Maria Luisa.jpg' },
    { id: 2050, name: 'Marquezote', brand: 'Sinai', category: 'grocery', subcategory: 'Pan Galleta', description: 'Traditional marquezote sponge cake.', image: 'images/Grocery-Sinai-Pan Galleta-Marquezote.jpg' },
    { id: 2051, name: 'Salpor', brand: 'Sinai', category: 'grocery', subcategory: 'Pan Galleta', description: 'Traditional salpor cookies.', image: 'images/Grocery-Sinai-Pan Galleta-Salpor.jpg' },
    
    // Pan Galleta - Other Brands
    { id: 2052, name: 'Club Extra', brand: 'Pozuelo', category: 'grocery', subcategory: 'Pan Galleta', description: 'Club extra crackers.', image: 'images/Grocery-Pozuelo-Pan Galleta-Club Extra.jpg' },
    { id: 2053, name: 'Egg Yolk Sponge cake', brand: 'Racor', category: 'grocery', subcategory: 'Pan Galleta', description: 'Rich egg yolk sponge cake.', image: 'images/Grocery-Racor-Pan Galleta-Egg Yolk Sponge cake.jpg' },
    { id: 2054, name: 'Marquesote', brand: 'Racor', category: 'grocery', subcategory: 'Pan Galleta', description: 'Traditional marquesote cake.', image: 'images/Grocery-Racor-pan galleta-Marquesote.jpg' },
    
    // Granos (Beans & Grains)
    { id: 2060, name: 'Arroz 4lb', brand: 'Arroz San Francisco', category: 'grocery', subcategory: 'Granos', description: 'Premium rice 4lb bag.', image: 'images/Grocery-Arroz San Francisco-Granos-Arroz 4lb.jpg' },
    { id: 2061, name: 'Frijol Negro', brand: 'Centroamericano', category: 'grocery', subcategory: 'Granos', description: 'Central American black beans.', image: 'images/Grocery-Centroamericano-Granos-Frijol Negro.jpg' },
    { id: 2062, name: 'Frijol Negro', brand: 'Cosecha Nueva', category: 'grocery', subcategory: 'Granos', description: 'New harvest black beans.', image: 'images/Grocery-Cosecha Nueva-Granos-Frijol Negro.jpg' },
    { id: 2063, name: 'Frijol Rojo 32oz', brand: 'Cuzcatlecos', category: 'grocery', subcategory: 'Granos', description: 'Red beans 32oz.', image: 'images/Grocery-Cuzcatlecos-Granos-Frijol Rojo 32oz.jpg' },
    { id: 2064, name: 'Frijol Rojo 64oz', brand: 'Cuzcatlecos', category: 'grocery', subcategory: 'Granos', description: 'Red beans 64oz.', image: 'images/Grocery-Cuzcatlecos-Granos-Frijol Rojo 64oz.jpg' },
    { id: 2065, name: 'Frijol Rojo DL', brand: 'Dona Lisa', category: 'grocery', subcategory: 'Granos', description: 'Red beans Dona Lisa brand.', image: 'images/Grocery-Dona Lisa-Granos-Frijol Rojo DL.jpg' },
    { id: 2066, name: 'Frijol Refrito', brand: 'Ducal', category: 'grocery', subcategory: 'Granos', description: 'Refried beans ready to eat.', image: 'images/Grocery-Ducal-Granos-Frijol Refrito.jpg' },
    { id: 2067, name: 'Frijol Blanco', brand: 'El Migueleno', category: 'grocery', subcategory: 'Granos', description: 'White beans.', image: 'images/Grocery-El Migueleno-Granos-Frijol Blanco.jpg' },
    { id: 2068, name: 'Frijol Rojo Naturas', brand: 'Naturas', category: 'grocery', subcategory: 'Granos', description: 'Naturas red beans.', image: 'images/Grocery-Naturas-Granos-Frijol Rojo Naturas.jpg' },
    
    // Harina (Flour)
    { id: 2070, name: 'Harnia de Arroz', brand: 'Dona Blanca', category: 'grocery', subcategory: 'Harina', description: 'Rice flour for baking.', image: 'images/Grocery-Dona Blanca-Harina-Harnia de Arroz.jpg' },
    { id: 2071, name: 'Pinol Maiz', brand: 'Lempira', category: 'grocery', subcategory: 'Harina', description: 'Ground corn flour.', image: 'images/Grocery-Lempira-Harina-Pinol Maiz.jpg' },
    { id: 2072, name: 'Harina', brand: 'Nueva Cosecha', category: 'grocery', subcategory: 'Harina', description: 'All-purpose flour.', image: 'images/Grocery-Nueva Cosecha-Harina-Harina.jpg' },
    { id: 2073, name: 'Harina de Arroz', brand: 'Racor', category: 'grocery', subcategory: 'Harina', description: 'Premium rice flour.', image: 'images/Grocery-Racor-Harina-Harina de Arroz.jpg' },
    
    // Cafe (Coffee)
    { id: 2080, name: 'Cafe Quetzal Instantaneo', brand: 'Cafe Quetzal', category: 'grocery', subcategory: 'Cafe', description: 'Instant coffee.', image: 'images/Grocery-Cafe Quetzal-Cafe-Cafe Quetzal Instantaneo.jpg' },
    { id: 2081, name: 'Instantaneo', brand: 'La Jarrillita', category: 'grocery', subcategory: 'Cafe', description: 'Instant coffee.', image: 'images/Grocery-La Jarrillita-cafe-instantaneo.jpg' },
    { id: 2082, name: 'Cafe Listo 3.5oz', brand: 'La Salvadorena', category: 'grocery', subcategory: 'Cafe', description: 'Ready coffee 3.5oz.', image: 'images/Grocery-La Salvadorena-Cafe-Cafe Listo 3.5oz.jpg' },
    { id: 2083, name: 'Cafe Listo 7oz', brand: 'La Salvadorena', category: 'grocery', subcategory: 'Cafe', description: 'Ready coffee 7oz.', image: 'images/Grocery-La Salvadorena-Cafe-Cafe Listo 7oz.jpg' },
    { id: 2084, name: 'Cafe Listo rojo', brand: 'La Salvadoreno', category: 'grocery', subcategory: 'Cafe', description: 'Ready coffee red blend.', image: 'images/Grocery-La Salvadoreno-Cafe-Cafe Listo rojo.jpg' },
    
    // Bebida (Drinks)
    { id: 2090, name: 'Naranja Chiquita', brand: 'De la Granja', category: 'grocery', subcategory: 'Bebida', description: 'Small orange juice.', image: 'images/Grocery-De la Granja-Bebida-Naranja Chiquita.jpg' },
    { id: 2091, name: 'Naranja', brand: 'De la Granja', category: 'grocery', subcategory: 'Bebida', description: 'Orange juice.', image: 'images/Grocery-De la Granja-Bebida-Naranja.jpg' },
    { id: 2092, name: 'Maracuya', brand: 'Del Fruto', category: 'grocery', subcategory: 'Bebida', description: 'Passion fruit juice.', image: 'images/Grocery-Del Fruto-Bebida-Maracuya.jpg' },
    { id: 2093, name: 'Soursop', brand: 'Del Fruto', category: 'grocery', subcategory: 'Bebida', description: 'Soursop guanabana juice.', image: 'images/Grocery-Del Fruto-Bebida-Soursop.jpg' },
    { id: 2094, name: 'Horchata Morro', brand: 'Dona Lisa', category: 'grocery', subcategory: 'Bebida', description: 'Horchata morro seed drink.', image: 'images/Grocery-Dona Lisa-Bebida-Horchata Morro.jpg' },
    { id: 2095, name: 'Adrenaline', brand: 'Energy', category: 'grocery', subcategory: 'Bebida', description: 'Energy drink.', image: 'images/Grocery-Energy-Bebida-Adrenaline.jpg' },
    { id: 2096, name: 'Rapotor Botella', brand: 'Energy', category: 'grocery', subcategory: 'Bebida', description: 'Raptor energy drink bottle.', image: 'images/Grocery-Energy-Bebida-Rapotor Botella.jpg' },
    { id: 2097, name: 'Rapotor Lata', brand: 'Energy', category: 'grocery', subcategory: 'Bebida', description: 'Raptor energy drink can.', image: 'images/Grocery-Energy-Bebida-Rapotor Lata.jpg' },
    { id: 2098, name: 'Maranon', brand: 'Frusecha', category: 'grocery', subcategory: 'Bebida', description: 'Cashew fruit juice.', image: 'images/Grocery-Frusecha-Bebida-Maranon.jpg' },
    { id: 2099, name: 'Chilate', brand: 'Racor', category: 'grocery', subcategory: 'Bebida', description: 'Traditional chilate drink.', image: 'images/Grocery-Racor-Bebida-Chilate.jpg' },
    { id: 2100, name: 'Horchata de Morro', brand: 'Racor', category: 'grocery', subcategory: 'Bebida', description: 'Morro seed horchata.', image: 'images/Grocery-Racor-Bebida-Horchata de Morro.jpg' },
    { id: 2101, name: 'Vaini Sula', brand: 'Sula', category: 'grocery', subcategory: 'Bebida', description: 'Vanilla flavored milk drink.', image: 'images/Grocery-Sula-Bebida-Vaini Sula.jpg' },
    
    // Salsa
    { id: 2110, name: 'Jalisco', brand: 'Mccormick', category: 'grocery', subcategory: 'Salsa', description: 'Jalisco style hot sauce.', image: 'images/Grocery-Mccormick-Salsa-Jalisco.jpg' },
    { id: 2111, name: 'Picamas Rojo', brand: 'Picamas', category: 'grocery', subcategory: 'Salsa', description: 'Red Picamas hot sauce.', image: 'images/Grocery-Picamas-Salsa-Picamas Rojo.jpg' },
    { id: 2112, name: 'Picamas Verde', brand: 'Picamas', category: 'grocery', subcategory: 'Salsa', description: 'Green Picamas hot sauce.', image: 'images/Grocery-Picamas-Salsa-Picamas Verde.jpg' },
    { id: 2113, name: 'Trompa De Chucho Rojo', brand: 'TC', category: 'grocery', subcategory: 'Salsa', description: 'Red Trompa de Chucho sauce.', image: 'images/Grocery-TC-Salsa-Trompa De Chucho Rojo.jpg' },
    { id: 2114, name: 'Trompa de Chucho Verde', brand: 'TC', category: 'grocery', subcategory: 'Salsa', description: 'Green Trompa de Chucho sauce.', image: 'images/Grocery-TC-Salsa-Trompa de Chucho Verde.jpg' },
    
    // Consume (Bouillon)
    { id: 2120, name: 'Bote Pequeno Pollo', brand: 'Malher', category: 'grocery', subcategory: 'Consume', description: 'Small chicken bouillon jar.', image: 'images/Grocery-Malher-Consume-Bote Pequeno Pollo.jpg' },
    { id: 2121, name: 'Bote Res', brand: 'Malher', category: 'grocery', subcategory: 'Consume', description: 'Beef bouillon jar.', image: 'images/Grocery-Malher-Consume-Bote Res.jpg' },
    { id: 2122, name: 'Camaron', brand: 'Malher', category: 'grocery', subcategory: 'Consume', description: 'Shrimp bouillon.', image: 'images/Grocery-Malher-Consume-Camaron.jpg' },
    { id: 2123, name: 'Grande de Pollo', brand: 'Malher', category: 'grocery', subcategory: 'Consume', description: 'Large chicken bouillon.', image: 'images/Grocery-Malher-Consume-Grande de Pollo.jpg' },
    { id: 2124, name: 'Pollo Grande bote', brand: 'Malher', category: 'grocery', subcategory: 'Consume', description: 'Large chicken bouillon jar.', image: 'images/Grocery-Malher-Consume-Pollo Grande bote.jpg' },
    { id: 2125, name: 'Res en tiras', brand: 'Malher', category: 'grocery', subcategory: 'Consume', description: 'Beef bouillon strips.', image: 'images/Grocery-Malher-Consume-Res en tiras.jpg' },
    
    // Sopa (Soup)
    { id: 2130, name: 'Pollo con Fidellos', brand: 'Maggi', category: 'grocery', subcategory: 'Sopa', description: 'Chicken noodle soup.', image: 'images/Grocery-Maggi-Sopa-Pollo con Fidellos.jpg' },
    
    // Chocolate
    { id: 2140, name: 'Chocolate en tablas', brand: 'El Salvadoreno', category: 'grocery', subcategory: 'Chocolate', description: 'Chocolate tablets for drinking.', image: 'images/Grocery-El Salvadoreno-Chocolate-Chocolate en tablas.jpg' },
    { id: 2141, name: 'Chocolate classico', brand: 'Melher', category: 'grocery', subcategory: 'Chocolate', description: 'Classic chocolate.', image: 'images/Grocery-melher-Chocolate classico.jpg' },
    
    // Vidro (Jarred goods)
    { id: 2150, name: 'Mango en Salmuera', brand: 'Dona Lisa', category: 'grocery', subcategory: 'Vidro', description: 'Mango in brine.', image: 'images/Grocery-Dona Lisa-Vidro-Mango en Salmuera.jpg' },
    { id: 2151, name: 'Guayabas', brand: 'Listto', category: 'grocery', subcategory: 'Vidro', description: 'Jarred guavas.', image: 'images/Grocery-Listto-Vidro-Guayabas.jpg' },
    { id: 2152, name: 'Nance', brand: 'Listto', category: 'grocery', subcategory: 'Vidro', description: 'Jarred nance fruit.', image: 'images/Grocery-Listto-Vidro-Nance.jpg' },
    
    // Misc
    { id: 2160, name: 'Aloe Vera', brand: 'Alo', category: 'grocery', subcategory: 'Misc', description: 'Aloe vera drink.', image: 'images/Grocery-Alo-Misc-Aloe Vera.jpg' },
    { id: 2161, name: 'Incaparina', brand: 'Incaparina', category: 'grocery', subcategory: 'Misc', description: 'Nutritious Incaparina cereal.', image: 'images/Grocery-Incaparina-misc-incaparina.jpg' },
    { id: 2162, name: 'Cremas', brand: 'Maggi', category: 'grocery', subcategory: 'Misc', description: 'Cream soup mix.', image: 'images/Grocery-Maggi-misc-Cremas.jpg' },
    
    // Empanizador
    { id: 2170, name: 'Rostizador', brand: 'Listto', category: 'grocery', subcategory: 'Empanizador', description: 'Breading and roasting mix.', image: 'images/Grocery-Listto-Empanizador-Rostizador.jpg' },
    
    // ==================== LACTOS (Dairy) ====================
    // Crema - Cremimex
    { id: 3001, name: 'Centro Americano', brand: 'Cremimex', category: 'lactos', subcategory: 'Crema', description: 'Central American style cream.', image: 'images/Lactos-Cremimex-crema-Centro Americano.jpg' },
    { id: 3002, name: 'Centro Americano', brand: 'Cremimex', category: 'lactos', subcategory: 'Crema', description: 'Central American style cream.', image: 'images/Lactos-Cremimex-Crema-Centro Americano(1).jpg' },
    
    // Crema - Cuzcatlecos
    { id: 3003, name: 'Salvadoreno', brand: 'Cuzcatlecos', category: 'lactos', subcategory: 'Crema', description: 'Salvadoran style cream.', image: 'images/LActos-Cuzcatlecos-Crema-Salvadoreno.jpg' },
    
    // Crema - Frusecha
    { id: 3004, name: 'Guatemal', brand: 'Frusecha', category: 'lactos', subcategory: 'Crema', description: 'Guatemalan style cream.', image: 'images/Lactos-Frusecha-Crema-Guatemal.jpg' },
    { id: 3005, name: 'Guatemala', brand: 'Frusecha', category: 'lactos', subcategory: 'Crema', description: 'Guatemalan cream.', image: 'images/Lactos-Frusecha-Crema-Guatemala.jpg' },
    { id: 3006, name: 'Salvadorena', brand: 'Frusecha', category: 'lactos', subcategory: 'Crema', description: 'Salvadoran cream.', image: 'images/Lactos-Frusecha-Crema-Salvadorena.jpg' },
    
    // Crema - La Ricura
    { id: 3007, name: 'Chontaleno', brand: 'La Ricura', category: 'lactos', subcategory: 'Crema', description: 'Chontaleño style cream.', image: 'images/Lactos-La Ricura-Crema-Chontaleno.jpg' },
    { id: 3008, name: 'Economica', brand: 'La Ricura', category: 'lactos', subcategory: 'Crema', description: 'Economical cream.', image: 'images/Lactos-La Ricura-Crema-Economica.jpg' },
    { id: 3009, name: 'Guanaquita', brand: 'La Ricura', category: 'lactos', subcategory: 'Crema', description: 'Guanaquita style cream.', image: 'images/Lactos-La Ricura-Crema-Guanaquita.jpg' },
    { id: 3010, name: 'Guatemala Bote', brand: 'La Ricura', category: 'lactos', subcategory: 'Crema', description: 'Guatemalan cream in jar.', image: 'images/Lactos-La Ricura-Crema-Guatemala Bote.jpg' },
    { id: 3011, name: 'Guatemala Bote', brand: 'La Ricura', category: 'lactos', subcategory: 'Crema', description: 'Guatemalan cream in jar.', image: 'images/Lactos-La Ricura-Crema-Guatemala Bote(1).jpg' },
    { id: 3012, name: 'Guatemala en bote', brand: 'La Ricura', category: 'lactos', subcategory: 'Crema', description: 'Jarred Guatemalan cream.', image: 'images/Lactos-La Ricura-Crema-Guatemala en bote.jpg' },
    { id: 3013, name: 'Miguelena', brand: 'La Ricura', category: 'lactos', subcategory: 'Crema', description: 'Miguelena style cream.', image: 'images/Lactos-La Ricura-Crema-Miguelena.jpg' },
    { id: 3014, name: 'Olancho', brand: 'La Ricura', category: 'lactos', subcategory: 'Crema', description: 'Olancho style cream.', image: 'images/Lactos-La Ricura-Crema-Olancho.jpg' },
    { id: 3015, name: 'Quetzal', brand: 'La Ricura', category: 'lactos', subcategory: 'Crema', description: 'Quetzal style cream.', image: 'images/Lactos-La Ricura-Crema-Quetzal.jpg' },
    { id: 3016, name: 'Rala', brand: 'La Ricura', category: 'lactos', subcategory: 'Crema', description: 'Thin pouring cream.', image: 'images/Lactos-La Ricura-Crema-Rala.jpg' },
    { id: 3017, name: 'Salvadorena Bote', brand: 'La Ricura', category: 'lactos', subcategory: 'Crema', description: 'Salvadoran cream in jar.', image: 'images/Lactos-La Ricura-Crema-Salvadorena Bote.jpg' },
    
    // Cuajada - DLC
    { id: 3020, name: 'Cuajada Salvadoreno', brand: 'DLC', category: 'lactos', subcategory: 'Cuajada', description: 'Salvadoran style curd cheese.', image: 'images/Lactos-DLC-Cuajada-Cuajada Salvadoreno.jpg' },
    
    // Cuajada - La Ricura
    { id: 3021, name: 'Cuajada con Chile', brand: 'La Ricura', category: 'lactos', subcategory: 'Cuajada', description: 'Curd cheese with chili.', image: 'images/LActos-La Ricura-Cuajada-Cuajada con Chile.jpg' },
    { id: 3022, name: 'Cuajada en Terron', brand: 'La Ricura', category: 'lactos', subcategory: 'Cuajada', description: 'Chunky curd cheese.', image: 'images/Lactos-La Ricura-Cuajada-Cuajada en Terron.jpg' },
    { id: 3023, name: 'Fresca con Loroco', brand: 'La Ricura', category: 'lactos', subcategory: 'Cuajada', description: 'Fresh cuajada with loroco.', image: 'images/Lactos-La Ricura-Cuajada-Fresca con Loroco.jpg' },
    { id: 3024, name: 'Fresca Hondurena', brand: 'La Ricura', category: 'lactos', subcategory: 'Cuajada', description: 'Honduran style fresh cuajada.', image: 'images/Lactos-La Ricura-Cuajada-Fresca Hondurena.jpg' },
    { id: 3025, name: 'Fresca Salvadorena', brand: 'La Ricura', category: 'lactos', subcategory: 'Cuajada', description: 'Salvadoran fresh cuajada.', image: 'images/Lactos-La Ricura-Cuajada-Fresca Salvadorena.jpg' },
    { id: 3026, name: 'Fresca Salvadorena', brand: 'La Ricura', category: 'lactos', subcategory: 'Cuajada', description: 'Salvadoran fresh cuajada.', image: 'images/Lactos-La Ricura-Cuajada-Fresca Salvadorena(1).jpg' },
    { id: 3027, name: 'Fresco Guatamala', brand: 'La Ricura', category: 'lactos', subcategory: 'Cuajada', description: 'Guatemalan fresh cuajada.', image: 'images/Lactos-La Ricura-Cuajada-Fresco Guatamala.jpg' },
    { id: 3028, name: 'Mi Ranchito', brand: 'La Ricura', category: 'lactos', subcategory: 'Cuajada', description: 'Mi Ranchito style cuajada.', image: 'images/Lactos-La Ricura-Cuajada-Mi Ranchito.jpg' },
    
    // Queso - Cuzcatlecos
    { id: 3030, name: 'Clasico', brand: 'Cuzcatlecos', category: 'lactos', subcategory: 'Queso', description: 'Classic cheese.', image: 'images/Lactos-cuzcatlecos-Queso-Clasico.jpg' },
    { id: 3031, name: 'Duro Blando', brand: 'Cuzcatlecos', category: 'lactos', subcategory: 'Queso', description: 'Semi-hard cheese.', image: 'images/Lactos-Cuzcatlecos-Queso-Duro Blando.jpg' },
    
    // Queso - DLC
    { id: 3032, name: 'Duro Blando con Chile', brand: 'DLC', category: 'lactos', subcategory: 'Queso', description: 'Semi-hard cheese with chili.', image: 'images/Lactos-DLC-Queso-Duro Blando con Chile.jpg' },
    { id: 3033, name: 'Duro Blando Loroco', brand: 'DLC', category: 'lactos', subcategory: 'Queso', description: 'Semi-hard cheese with loroco.', image: 'images/Lactos-DLC-Queso-Duro Blando Loroco.jpg' },
    { id: 3034, name: 'Duro Blando', brand: 'DLC', category: 'lactos', subcategory: 'Queso', description: 'Semi-hard cheese.', image: 'images/Lactos-DLC-Queso-Duro Blando.jpg' },
    { id: 3035, name: 'Duro Viejo', brand: 'DLC', category: 'lactos', subcategory: 'Queso', description: 'Aged hard cheese.', image: 'images/Lactos-DLC-Queso-Duro Viejo.jpg' },
    { id: 3036, name: 'Morolique', brand: 'DLC', category: 'lactos', subcategory: 'Queso', description: 'Morolique style cheese.', image: 'images/Lactos-DLC-Queso-Morolique.jpg' },
    { id: 3037, name: 'Quesillo', brand: 'DLC', category: 'lactos', subcategory: 'Queso', description: 'String cheese.', image: 'images/Lactos-DLC-Queso-Quesillo.jpg' },
    
    // Queso - La Ricura
    { id: 3040, name: 'Arrocero', brand: 'La Ricura', category: 'lactos', subcategory: 'Queso', description: 'Rice-style cheese.', image: 'images/Lactos-La Ricura-Queso-Arrocero.jpg' },
    { id: 3041, name: 'Bolsa Azul', brand: 'La Ricura', category: 'lactos', subcategory: 'Queso', description: 'Blue bag cheese.', image: 'images/Lactos-La Ricura-Queso-Bolsa Azul.jpg' },
    { id: 3042, name: 'Chinameca', brand: 'La Ricura', category: 'lactos', subcategory: 'Queso', description: 'Chinameca style cheese.', image: 'images/Lactos-La Ricura-Queso-Chinameca.jpg' },
    { id: 3043, name: 'Chontaleno', brand: 'La Ricura', category: 'lactos', subcategory: 'Queso', description: 'Chontaleño style cheese.', image: 'images/Lactos-La Ricura-Queso-Chontaleno.jpg' },
    { id: 3044, name: 'Coyolito', brand: 'La Ricura', category: 'lactos', subcategory: 'Queso', description: 'Coyolito style cheese.', image: 'images/Lactos-La Ricura-Queso-Coyolito.jpg' },
    { id: 3045, name: 'Duro Viejo', brand: 'La Ricura', category: 'lactos', subcategory: 'Queso', description: 'Aged hard cheese.', image: 'images/Lactos-La Ricura-Queso-Duro Viejo .jpg' },
    { id: 3046, name: 'Economico', brand: 'La Ricura', category: 'lactos', subcategory: 'Queso', description: 'Economical cheese.', image: 'images/Lactos-La Ricura-Queso-Economico.jpg' },
    { id: 3047, name: 'Fresco con Mashan', brand: 'La Ricura', category: 'lactos', subcategory: 'Queso', description: 'Fresh cheese with mashan.', image: 'images/Lactos-La Ricura-Queso-Fresco con Mashan.jpg' },
    { id: 3048, name: 'Frijolero con Chile', brand: 'La Ricura', category: 'lactos', subcategory: 'Queso', description: 'Bean cheese with chili.', image: 'images/Lactos-La Ricura-Queso-Frijolero con Chile.jpg' },
    { id: 3049, name: 'Frijolero con Loroco', brand: 'La Ricura', category: 'lactos', subcategory: 'Queso', description: 'Bean cheese with loroco.', image: 'images/Lactos-La Ricura-Queso-Frijolero con Loroco.jpg' },
    { id: 3050, name: 'Frijolero', brand: 'La Ricura', category: 'lactos', subcategory: 'Queso', description: 'Cheese for beans.', image: 'images/Lactos-La Ricura-Queso-Frijolero.jpg' },
    { id: 3051, name: 'Olancho Arrocero', brand: 'La Ricura', category: 'lactos', subcategory: 'Queso', description: 'Olancho rice-style cheese.', image: 'images/Lactos-La Ricura-Queso-Olancho Arrocero.jpg' },
    { id: 3052, name: 'Olancho Frijolero', brand: 'La Ricura', category: 'lactos', subcategory: 'Queso', description: 'Olancho bean cheese.', image: 'images/Lactos-La Ricura-Queso-Olancho Frijolero.jpg' },
    { id: 3053, name: 'Para Freir', brand: 'La Ricura', category: 'lactos', subcategory: 'Queso', description: 'Frying cheese.', image: 'images/Lactos-La Ricura-Queso-Para Freir.jpg' },
    { id: 3054, name: 'Perla', brand: 'La Ricura', category: 'lactos', subcategory: 'Queso', description: 'Pearl cheese.', image: 'images/Lactos-La Ricura-Queso-Perla.jpg' },
    { id: 3055, name: 'Pupusa 1lb', brand: 'La Ricura', category: 'lactos', subcategory: 'Queso', description: 'Cheese for pupusas 1lb.', image: 'images/Lactos-La Ricura-Queso-Pupusa 1lb.jpg' },
    { id: 3056, name: 'Pupusa 2lb', brand: 'La Ricura', category: 'lactos', subcategory: 'Queso', description: 'Cheese for pupusas 2lb.', image: 'images/Lactos-La Ricura-Queso-Pupusa 2lb.jpg' },
    { id: 3057, name: 'San Miguel', brand: 'La Ricura', category: 'lactos', subcategory: 'Queso', description: 'San Miguel style cheese.', image: 'images/Lactos-La Ricura-Queso-San Miguel.jpg' },
    { id: 3058, name: 'Zacapa', brand: 'La Ricura', category: 'lactos', subcategory: 'Queso', description: 'Zacapa style cheese.', image: 'images/Lactos-La Ricura-Queso-Zacapa.jpg' },
    
    // ==================== VITAMINAS ====================
    { id: 4001, name: 'Kofal rojo', brand: 'Kofal', category: 'vitaminas', subcategory: 'Crema', description: 'Red Kofal pain relief cream.', image: 'images/Vitaminas-Crema-Kofal rojo.jpg' },
    { id: 4002, name: 'Mariguanol', brand: 'Mariguanol', category: 'vitaminas', subcategory: 'Crema', description: 'Hemp oil muscle rub gel.', image: 'images/Vitaminas-Crema-Mariguanol.jpg' },
    { id: 4003, name: 'Glotolin', brand: 'Glotolin', category: 'vitaminas', subcategory: 'Kids', description: 'Children\'s appetite supplement.', image: 'images/Vitaminas-Kids-Liquido-Glotolin.jpg' },
    { id: 4004, name: 'Dolo Neurobion', brand: 'NueroBion', category: 'vitaminas', subcategory: 'Liquido', description: 'Pain relief vitamin B complex.', image: 'images/Vitaminas-nuerobion-dolo neurobion.jpg' },
    { id: 4005, name: 'Energy', brand: 'NueroBion', category: 'vitaminas', subcategory: 'Liquido', description: 'Energy boosting B vitamins.', image: 'images/Vitaminas-NueroBion-Energy.jpg' },
];

// Get products by category
export function getProductsByCategory(categoryId) {
    return PRODUCTS.filter(p => p.category === categoryId);
}

// Get products by category and subcategory
export function getProductsBySubcategory(categoryId, subcategory) {
    return PRODUCTS.filter(p => p.category === categoryId && p.subcategory === subcategory);
}

// Get products by brand
export function getProductsByBrand(brand) {
    return PRODUCTS.filter(p => p.brand.toLowerCase() === brand.toLowerCase());
}

// Get brands for a category
export function getBrandsForCategory(categoryId) {
    const category = CATEGORIES.find(c => c.id === categoryId);
    return category ? category.brands : [];
}

// Get subcategories for a category
export function getSubcategoriesForCategory(categoryId) {
    const category = CATEGORIES.find(c => c.id === categoryId);
    return category ? category.subcategories : [];
}

// Get unique brands from products in a category
export function getUniqueBrandsInCategory(categoryId) {
    const products = getProductsByCategory(categoryId);
    const brands = [...new Set(products.map(p => p.brand))];
    return brands.filter(b => b); // Remove empty strings
}

// Get unique subcategories from products in a category
export function getUniqueSubcategoriesInCategory(categoryId) {
    const products = getProductsByCategory(categoryId);
    return [...new Set(products.map(p => p.subcategory))].filter(s => s);
}

// Search products
export function searchProducts(query) {
    const lowerQuery = query.toLowerCase();
    return PRODUCTS.filter(p => 
        p.name.toLowerCase().includes(lowerQuery) ||
        p.brand.toLowerCase().includes(lowerQuery) ||
        p.description.toLowerCase().includes(lowerQuery) ||
        (p.subcategory && p.subcategory.toLowerCase().includes(lowerQuery))
    );
}
