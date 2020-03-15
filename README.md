# Flask Restless data provider
A React-admin data provider for backends built with Flask Restless

## Usage

```js
// in App.js
import React from 'react';
import { Admin, Resource } from 'react-admin';
import dataProvider from 'flask-restless-ra';
import { UserList } from './users';

const App = () => (
    <Admin dataProvider={dataProvider('http://path.to.api/')}>
        <Resource name="users" list={UserList} />
    </Admin>
);

export default App;
```