const mongoose = require("mongoose")
const validator = require("validator")
const User = require("./userModel")

const schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'You must write a name'],
      unique: true,
      trim: true,
      minlength: 5,
      validate: [validator.isEmail, 'name is not a email'],
    },
    rating: {
      type: Number,
      default: 4.5,
    },
    price: {
      type: Number,
      required: [true, 'You must write a price'],
      validate: {
        validator: function (val) {
          return val < 11000;
        },
        message: 'Price is too high',
      },
    },
    startDate: {
      type: Array,
      required: [true, 'You did not add dates'],
    },
    secret: {
      type: Boolean,
    },
    startLocation: {
      //geoJSON
      type: {
        type: String,
        default: "Point",
        enum: ["Point"]
      },
      coordinates: [Number],
      address: String,
      description: String
    },
    locations: [
      {
        type: {
          type: String,
          default: "Point",
          enum: ["Point"]
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number
      }
    ],
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "User"
      }
    ]
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

schema.virtual('price2').get(function () {
  return this.price / 2;
});

schema.virtual("reviews", {
  ref: "Review",
  foreignField: "tour",
  localField: "_id"
})

schema.virtual("avgRating").get(function(){
  const totalRating = this.reviews.reduce((acc, review) => acc + review.rating, 0);
  return totalRating / this.reviews.length;

})

// schema.pre("save", async function(next){
//   const guidesPromises = this.guides.map(async id => await User.findById(id))
//   this.guides = await Promise.all(guidesPromises)
//   next()
// })

schema.pre(/^find/, function (next) {
  this.find({ secret: { $ne: true } });
  next();
});

schema.pre(/^find/, function(next){
  this.populate({
    path: "guides",
    select: "-__v, -passwordChangedAt"
  })

  next()
})

schema.pre('aggregate', function (next) {
  this.pipeline().unshift({ $match: { secret: { $ne: true } } });
  next();
});

module.exports = mongoose.model('TestModel', schema);