import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { EntryAttributes } from "../common";

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "database.db",
});

type EntryCreationAttributes = Optional<EntryAttributes, "id">;

export class EntryModel
  extends Model<EntryAttributes, EntryCreationAttributes>
  implements EntryAttributes
{
  declare id: string;
  declare timestamp: number;
  declare ip: string;
  declare changedAfter: number;
  declare lastUpdated: number;
}

EntryModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    timestamp: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: () => Date.now(),
    },
    lastUpdated: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: () => Date.now(),
    },
    ip: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "N/A",
    },
    changedAfter: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: "Entry",
  }
);

export const initDatabase = async () => {
  await sequelize.authenticate();
  await sequelize.sync();
};

export default sequelize;
