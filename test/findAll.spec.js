'use strict';

describe('DSSqlAdapter#findAll', function () {
  it('should not return relation columns on parent', function* () {
    let profile1 = yield adapter.create(Profile, { email: 'foo@test.com' });
    let user1 = yield adapter.create(User, {name: 'John', profileId: profile1.id});

    let users = yield adapter.findAll(User, {'profile.email': 'foo@test.com'});
    assert.equal(users.length, 1);
    assert.equal(users[0].profileId, profile1.id);
    assert.isUndefined(users[0].email);
  });

  it('should filter when relations have same column if column is qualified', function* () {
    let profile1 = yield adapter.create(Profile, { email: 'foo@test.com' });
    let user1 = yield adapter.create(User, {name: 'John', profileId: profile1.id});

    // `id` column must be qualified with `user.`
    let users = yield adapter.findAll(User, {'user.id': user1.id, 'profile.email': 'foo@test.com'});
    assert.equal(users.length, 1);
    assert.equal(users[0].profileId, profile1.id);
  });

  describe('near', function () {
    beforeEach(function * () {
      this.googleAddress    = yield adapter.create(Address, { name : 'Google',    latitude: 37.4219999, longitude: -122.0862515 });
      this.appleAddress     = yield adapter.create(Address, { name : 'Apple',     latitude: 37.331852,  longitude: -122.029599 });
      this.microsoftAddress = yield adapter.create(Address, { name : 'Microsoft', latitude: 47.639649,  longitude: -122.128255 });
      this.amazonAddress    = yield adapter.create(Address, { name : 'Amazon',    latitude: 47.622915,  longitude: -122.336384 });
    })

    it('should filter using "near"', function* () {
      let addresses = yield adapter.findAll(Address, {
        where: {
          'latitude,longitude': {
            'near': {
              center: [37.41, -122.06],
              radius: 10
            }
          }
        }
      });
      assert.equal(addresses.length, 2);
      assert.equal(addresses[0].name, 'Google');
      assert.equal(addresses[1].name, 'Apple');
    })

    it('should not contain distance column by default', function* () {
      let addresses = yield adapter.findAll(Address, {
        where: {
          'latitude,longitude': {
            'near': {
              center: [37.41, -122.06],
              radius: 5
            }
          }
        }
      });
      assert.equal(addresses.length, 1);
      assert.equal(addresses[0].name, 'Google');
      assert.equal(addresses[0].distance, undefined);
    })

    it('should contain distance column if "calculateDistance" is truthy', function* () {
      let addresses = yield adapter.findAll(Address, {
        where: {
          'latitude,longitude': {
            'near': {
              center: [37.41, -122.06],
              radius: 10,
              calculateDistance: true
            }
          }
        }
      });
      assert.equal(addresses.length, 2);

      assert.equal(addresses[0].name, 'Google');
      assert.isNotNull(addresses[0].distance);
      assert.equal(Math.round(addresses[0].distance), 2);

      assert.equal(addresses[1].name, 'Apple');
      assert.isNotNull(addresses[1].distance);
      assert.equal(Math.round(addresses[1].distance), 6);
    })

    it('should contain custom distance column if "calculateDistance" is string', function* () {
      let addresses = yield adapter.findAll(Address, {
        where: {
          'latitude,longitude': {
            'near': {
              center: [37.41, -122.06],
              radius: 10,
              calculateDistance: 'howfar'
            }
          }
        }
      });
      assert.equal(addresses.length, 2);

      assert.equal(addresses[0].name, 'Google');
      assert.equal(addresses[0].distance, undefined);
      assert.isNotNull(addresses[0].howfar);
      assert.equal(Math.round(addresses[0].howfar), 2);

      assert.equal(addresses[1].name, 'Apple');
      assert.equal(addresses[1].distance, undefined);
      assert.isNotNull(addresses[1].howfar);
      assert.equal(Math.round(addresses[1].howfar), 6);
    })

    it('should use kilometers instead of miles if radius ends with "k"', function* () {
      let addresses = yield adapter.findAll(Address, {
        where: {
          'latitude,longitude': {
            'near': {
              center: [37.41, -122.06],
              radius: '10k',
              calculateDistance: true
            }
          }
        }
      });
      assert.equal(addresses.length, 2);

      assert.equal(addresses[0].name, 'Google');
      assert.isNotNull(addresses[0].distance);
      assert.equal(Math.round(addresses[0].distance), 3); // in kilometers

      assert.equal(addresses[1].name, 'Apple');
      assert.isNotNull(addresses[1].distance);
      assert.equal(Math.round(addresses[1].distance), 9); // in kilometers
    })

    it('should filter through relationships', function* () {
      let user1 = yield adapter.create(User, { name : 'Larry Page', addressId: this.googleAddress.id });
      let user2 = yield adapter.create(User, { name : 'Tim Cook', addressId: this.appleAddress.id });

      let users = yield adapter.findAll(User, {
        where: {
          'address.latitude, address.longitude': {
            'near': {
              center: [37.41, -122.06],
              radius: 10,
              calculateDistance: 'howfar'
            }
          }
        }
      });
      assert.equal(users.length, 2);
      assert.equal(users[0].name, 'Larry Page');
      assert.equal(users[1].name, 'Tim Cook');
    })

    it('should filter through multiple hasOne/belongsTo relations', function * () {
      let user1 = yield adapter.create(User, { name : 'Larry Page', addressId: this.googleAddress.id });
      var post1 = yield adapter.create(Post, {content: 'foo', userId: user1.id})
      yield adapter.create(Comment, {content: 'test1', postId: post1.id, userId: post1.userId})

      var user2 = yield adapter.create(User, {name: 'Tim Cook', addressId: this.appleAddress.id})
      var post2 = yield adapter.create(Post, {content: 'bar', userId: user2.id})
      yield adapter.create(Comment, {content: 'test2', postId: post2.id, userId: post2.userId})

      let comments = yield adapter.findAll(Comment, {
        where: {
          'user.address.latitude, user.address.longitude': {
            'near': {
              center: [37.41, -122.06],
              radius: 5
            }
          }
        }
      });

      assert.equal(comments.length, 1)
      assert.equal(comments[0].userId, user1.id)
      assert.equal(comments[0].content, 'test1')
    })

  })
});
